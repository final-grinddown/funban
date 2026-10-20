use anyhow::{Context, Result};
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
    Argon2,
};
use sqlx::{
    mysql::{MySqlConnectOptions, MySqlPoolOptions},
    MySqlPool,
};
use std::io::{self, Write};

#[tokio::main]
async fn main() -> Result<()> {
    // Load .env file
    dotenvy::dotenv().ok();

    // Parse command line arguments
    let args: Vec<String> = std::env::args().collect();
    let (email, name, password, force) = if args.len() > 1 {
        // Non-interactive mode: parse CLI arguments
        if args.len() < 4 {
            eprintln!("Usage: {} <email> <name> <password> [--force]", args[0]);
            eprintln!("   or: {} (for interactive mode)", args[0]);
            std::process::exit(1);
        }
        let force = args.get(4).map(|s| s == "--force").unwrap_or(false);
        (args[1].clone(), args[2].clone(), args[3].clone(), force)
    } else {
        // Interactive mode: prompt for credentials
        println!("=== Create Admin User ===\n");

        let email = prompt("Email: ")?;
        let name = prompt("Name: ")?;
        let password = prompt_password("Password: ")?;
        let password_confirm = prompt_password("Confirm password: ")?;

        if password != password_confirm {
            anyhow::bail!("Passwords do not match");
        }

        let force_input = prompt("Force recreate if user exists? (y/N): ")?;
        let force = force_input.to_lowercase() == "y" || force_input.to_lowercase() == "yes";

        (email, name, password, force)
    };

    // Connect to database
    let pool = connect_to_database().await?;

    // Check if user already exists
    let existing_user: Option<(i32,)> = sqlx::query_as("SELECT id FROM users WHERE email = ?")
        .bind(&email)
        .fetch_optional(&pool)
        .await?;

    if let Some((user_id,)) = existing_user {
        if force {
            println!("User with email '{}' exists. Deleting...", email);
            sqlx::query("DELETE FROM users WHERE id = ?")
                .bind(user_id)
                .execute(&pool)
                .await?;
        } else {
            anyhow::bail!(
                "User with email '{}' already exists. Use --force to recreate.",
                email
            );
        }
    }

    // Hash password using Argon2
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| anyhow::anyhow!("Failed to hash password: {}", e))?
        .to_string();

    // Insert user into database
    sqlx::query("INSERT INTO users (email, name, password, color) VALUES (?, ?, ?, ?)")
        .bind(&email)
        .bind(&name)
        .bind(&password_hash)
        .bind("#000000") // Default color
        .execute(&pool)
        .await
        .context("Failed to insert user into database")?;

    println!("\n✓ Admin user created successfully!");
    println!("  Email: {}", email);
    println!("  Name: {}", name);

    Ok(())
}

async fn connect_to_database() -> Result<MySqlPool> {
    // Load configuration from environment
    let database_url = std::env::var("FUNBAN_DATABASE_URL")
        .or_else(|_| std::env::var("DATABASE_URL"))
        .unwrap_or_else(|_| "127.0.0.1".to_string());

    let database_user = std::env::var("FUNBAN_DATABASE_USER")
        .or_else(|_| std::env::var("DATABASE_USER"))
        .unwrap_or_else(|_| "root".to_string());

    let database_password = std::env::var("FUNBAN_DATABASE_PASSWORD")
        .or_else(|_| std::env::var("DATABASE_PASSWORD"))
        .context("FUNBAN_DATABASE_PASSWORD or DATABASE_PASSWORD must be set")?;

    let database_name = std::env::var("FUNBAN_DATABASE_NAME")
        .or_else(|_| std::env::var("DATABASE_NAME"))
        .unwrap_or_else(|_| "funban".to_string());

    println!("Connecting to database...");
    println!("  Host: {}", database_url);
    println!("  Database: {}", database_name);
    println!("  User: {}", database_user);

    let opts = MySqlConnectOptions::new()
        .host(&database_url)
        .username(&database_user)
        .password(&database_password)
        .database(&database_name)
        .ssl_mode(sqlx::mysql::MySqlSslMode::Disabled);

    let pool = MySqlPoolOptions::new()
        .max_connections(1)
        .connect_with(opts)
        .await
        .context("Failed to connect to database")?;

    println!("✓ Connected to database\n");

    Ok(pool)
}

fn prompt(message: &str) -> Result<String> {
    print!("{}", message);
    io::stdout().flush()?;

    let mut input = String::new();
    io::stdin().read_line(&mut input)?;

    Ok(input.trim().to_string())
}

fn prompt_password(message: &str) -> Result<String> {
    print!("{}", message);
    io::stdout().flush()?;

    // For simplicity, we'll just read from stdin
    // In a production environment, you might want to use a crate like `rpassword`
    let mut input = String::new();
    io::stdin().read_line(&mut input)?;

    Ok(input.trim().to_string())
}

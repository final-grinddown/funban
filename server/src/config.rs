use config::{Config, ConfigError, Environment, File};
use serde::{Deserialize, Serialize};

#[derive(Debug)]
pub enum SettingError {
    InnerInitError(ConfigError),
    InnerDeserializationError(ConfigError),
}

#[derive(Debug, Deserialize, Serialize, Clone, Default)]
pub struct Configuration {
    pub api_secret: String,
    pub cookie_domain: String,
    //pub ws_secret: String,
    pub api_password: String,
    pub database_url: String,
    pub database_password: String,
    pub database_user: String,
    pub database_name: String,
    pub cors_origin: String,
    pub cookie_secure: bool,
    pub port: u16,
}

impl Configuration {
    pub fn setup_config() -> Result<Self, SettingError> {
        let settings = Config::builder()
            // Start with the config file
            .add_source(File::with_name("env.toml").required(false))
            // Add in settings from the environment (with a prefix of APP)
            .add_source(Environment::with_prefix("FUNBAN"))
            // Optionally include secrets from a secrets manager here
            .build()
            .map_err(SettingError::InnerInitError)?;

        settings
            .try_deserialize()
            .map_err(SettingError::InnerDeserializationError)
    }
}

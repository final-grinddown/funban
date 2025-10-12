use axum::http::HeaderValue;

#[cfg(test)]
pub mod test;

pub fn parse_origins(config: &str) -> anyhow::Result<Vec<HeaderValue>> {
    Ok(config
        .split(';')
        .filter(|origin| !origin.is_empty())
        .filter_map(|origin| origin.parse::<HeaderValue>().ok())
        .collect())
}

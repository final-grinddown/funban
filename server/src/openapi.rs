use utoipa::{
    openapi::security::{Http, HttpAuthScheme, SecurityScheme},
    Modify, OpenApi,
};

struct SecurityAddon;

impl Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = openapi.components.as_mut() {
            components.add_security_scheme(
                "jwt",
                SecurityScheme::Http(Http::new(HttpAuthScheme::Bearer)),
            )
        }
    }
}

#[derive(OpenApi)]
#[openapi(
		modifiers(&SecurityAddon),
    paths(
        crate::http::routes::history::get_all,
        crate::http::routes::history::get_by_id,
        crate::http::routes::history::get_last,
        crate::http::routes::history::create,
				crate::http::routes::history::rename,
				crate::http::routes::history::remove,
        crate::http::routes::history::get_latest_browser,
        crate::http::routes::history::get_browser,
        crate::http::routes::auth::signin,
        crate::http::routes::auth::me,
        crate::http::routes::health::ping,
        crate::http::routes::health::version,
    ),
    components(
        schemas(crate::http::routes::history::HistoryDto),
        schemas(crate::http::routes::history::BrowserInfoDto),
        schemas(crate::http::routes::history::BrowserInfoBitDto),
        schemas(crate::model::history::HistoryInsert),
        schemas(crate::model::history::HistoryRename),
        schemas(crate::http::routes::auth::MeResponse),
        schemas(crate::http::routes::auth::TokenResponse),
        schemas(crate::http::routes::auth::SignIn),
    ),
		servers(
			(url = "http://localhost:3001/api", description = "Local server"),
			(url = "https://funban.dev/api", description = "Production server")
		),
    info(title = "Funban API", version = "1.0.1", description = "API documentation for Funban")
)]
pub struct ApiDoc;

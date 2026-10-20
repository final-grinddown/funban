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
        crate::http::routes::release::get_all,
        crate::http::routes::release::get_by_id,
        crate::http::routes::release::create,
        crate::http::routes::release::update,
        crate::http::routes::release::remove,
        crate::http::routes::release::close,
        crate::http::routes::release::update_notes,
        crate::http::routes::release::update_task,
        crate::http::routes::release::add_tasks_from_template,
        crate::http::routes::release::reopen,
        crate::http::routes::release_settings::get_settings,
        crate::http::routes::release_settings::update_settings,
        crate::http::routes::release_settings::get_steps,
        crate::http::routes::release_settings::update_steps,
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
        schemas(crate::model::release::Release),
        schemas(crate::model::release::ReleaseType),
        schemas(crate::model::release::ReleaseTask),
        schemas(crate::model::release_settings::ReleaseStep),
        schemas(crate::http::routes::release::ReleaseTaskRequest),
        schemas(crate::model::release_settings::ReleaseSettings),
        schemas(crate::http::routes::release::ReleaseRequest),
        schemas(crate::http::routes::release::CloseReleaseRequest),
        schemas(crate::http::routes::release::ReleaseNotesRequest),
        schemas(crate::http::routes::auth::MeResponse),
        schemas(crate::http::routes::auth::TokenResponse),
        schemas(crate::http::routes::auth::SignIn),
    ),
		servers(
			(url = "http://localhost:3001/api", description = "Local server"),
			(url = "https://funban.dev/api", description = "Production server")
		),
    info(title = "Funban API", version = "1.2.13", description = "API documentation for Funban")
)]
pub struct ApiDoc;

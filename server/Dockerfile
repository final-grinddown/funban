FROM lukemathwalker/cargo-chef:0.1.68-rust-latest as chef
WORKDIR /app

FROM chef AS planner
COPY ./Cargo.toml ./Cargo.lock ./
COPY ./src ./src
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
ENV SQLX_OFFLINE=true
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json
COPY . .
RUN cargo build --release --bin funban-server
RUN mv ./target/release/funban-server ./app && chmod +x ./app

FROM gcr.io/distroless/cc-debian12 AS runtime
COPY --from=builder /app/app /app
EXPOSE 3001
CMD ["/app"]

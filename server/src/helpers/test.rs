use super::*;

#[test]
fn test_parse_origins_single() {
    let origins = parse_origins("http://localhost:3000").unwrap();

    assert_eq!(origins.len(), 1);
}

#[test]
fn test_parse_origins_extra_amper() {
    let origins = parse_origins("http://localhost:3000;;").unwrap();

    assert_eq!(origins.len(), 1);
}

#[test]
fn test_parse_origins_prefix_amper() {
    let origins = parse_origins(";http://localhost:3000").unwrap();

    assert_eq!(origins.len(), 1);
}

#[test]
fn test_parse_origins_multiple() {
    let origins = parse_origins("http://localhost:3000;http://localhost:3001").unwrap();

    assert_eq!(origins.len(), 2);
}

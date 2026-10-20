INSERT INTO
    history (
        id,
        label,
        created_at,
        snapshot
    )
VALUES (
        1,
        'abcde',
        '2023-01-01 10:00:00',
        '{"key1": "value1", "key2": "value2"}'
    ),
    (
        3,
        NULL,
        '2023-01-02 11:00:00',
        '{"keyA": "valueA", "keyB": 123}'
    ),
    (
        4,
        'fghij',
        '2023-01-03 12:00:00',
        '{"foo": "bar", "baz": true}'
    ),
    (
        7,
        'klmno',
        '2023-01-04 13:00:00',
        '{"array": [1, 2, 3], "nested": {"key": "value"}}'
    ),
    (
        10,
        NULL,
        '2023-01-05 14:00:00',
        '{"null_value": null, "number": 456}'
    );
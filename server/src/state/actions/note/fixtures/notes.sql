insert into
    notes (
        id,
        predecessor_id,
        owner,
        state,
        text
    )
values (
        1,
        NULL,
        1,
        'todo',
        'Alice todo note 1'
    );

insert into
    notes (
        id,
        predecessor_id,
        owner,
        state,
        text
    )
values (
        2,
        1,
        1,
        'todo',
        'Alice todo note 2'
    );

insert into
    notes (
        id,
        predecessor_id,
        owner,
        state,
        text,
        tag
    )
values (
        3,
        NULL,
        1,
        'in_progress',
        'Alice in_progress note 3',
        'IMPORTANT'
    );
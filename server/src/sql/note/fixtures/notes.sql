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
        1,
        NULL,
        1,
        'todo',
        'Alice todo note 1',
				NULL
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
        2,
        1,
        1,
        'todo',
        'Alice todo note 2',
				'IMPORTANT'
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
				NULL
    );
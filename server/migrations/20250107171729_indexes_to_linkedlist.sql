ALTER TABLE notes ADD COLUMN predecessor_id INTEGER REFERENCES notes(id);

SET @rank := -1;
SET @current_column := '';

UPDATE notes, 
   (SELECT id, state, `index`,
       @rank := IF(CAST(@current_column AS CHAR) = CAST(state AS CHAR), @rank + 1,
           IF(@current_column := state, 0, 0)
       ) AS new_index
   FROM notes
   ORDER BY state, `index`) AS t
SET notes.`index` = t.new_index
WHERE notes.id = t.id;

UPDATE notes
SET predecessor_id = (
    SELECT id FROM (
        SELECT id, state, `index`
        FROM notes
    ) prev
    WHERE prev.state = notes.state 
    AND prev.`index` = notes.`index` - 1
) 
WHERE `index` > 0;

ALTER TABLE notes DROP COLUMN `index`;
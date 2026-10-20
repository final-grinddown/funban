-- transfer_cases.sql
INSERT INTO notes 
(id, 	predecessor_id, owner, 	state, 	text) VALUES
(1, 	NULL,						1, 		 	'todo', 'First todo'),
(2, 	1, 							1, 		 	'todo', 'Second todo'),
(3, 	2, 							1, 		 	'todo', 'Third todo'),
(4, 	3, 							1, 		 	'todo', 'Fourth todo'),
(5, 	NULL,						1, 		 	'done', 'First done'),
(6, 	5, 							1, 		 	'done', 'Second done'),
(7, 	6, 							1, 		 	'done', 'Third done');
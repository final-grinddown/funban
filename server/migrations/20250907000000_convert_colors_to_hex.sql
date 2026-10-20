-- Convert color names to hex values in users table
-- This prepares for future free color selection and fixes production consistency

UPDATE users SET color = '#f44336' WHERE color = 'Red';
UPDATE users SET color = '#e91e63' WHERE color = 'Pink';
UPDATE users SET color = '#9c27b0' WHERE color = 'Purple';
UPDATE users SET color = '#673ab7' WHERE color = 'Deep Purple';
UPDATE users SET color = '#3f51b5' WHERE color = 'Indigo';
UPDATE users SET color = '#2196f3' WHERE color = 'Blue';
UPDATE users SET color = '#03a9f4' WHERE color = 'Light Blue';
UPDATE users SET color = '#00bcd4' WHERE color = 'Cyan';
UPDATE users SET color = '#009688' WHERE color = 'Teal';
UPDATE users SET color = '#4caf50' WHERE color = 'Green';
UPDATE users SET color = '#8bc34a' WHERE color = 'Light Green';
UPDATE users SET color = '#cddc39' WHERE color = 'Lime';
UPDATE users SET color = '#ffeb3b' WHERE color = 'Yellow';
UPDATE users SET color = '#ffc107' WHERE color = 'Amber';
UPDATE users SET color = '#ff9800' WHERE color = 'Orange';
UPDATE users SET color = '#ff5722' WHERE color = 'Deep Orange';
UPDATE users SET color = '#795548' WHERE color = 'Brown';
UPDATE users SET color = '#9e9e9e' WHERE color = 'Grey';
UPDATE users SET color = '#607d8b' WHERE color = 'Blue Grey';
UPDATE users SET color = '#000000' WHERE color = 'Black';
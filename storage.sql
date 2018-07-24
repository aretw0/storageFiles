CREATE TABLE users(
id INTEGER PRIMARY KEY AUTOINCREMENT,
name VARCHAR(50) NOT NULL,
birthday VARCHAR(10) NOT NULL,
sexo VARCHAR(20) NOT NULL,
nick VARCHAR(10) NOT NULL,
email VARCHAR(20) NOT NULL,
password VARCHAR(10) NOT NULL,
token VARCHAR(32) NOT NULL
);

CREATE TABLE folders(
id INTEGER PRIMARY KEY AUTOINCREMENT,
nameFolder VARCHAR(10) NOT NULL,
idUser INTEGER NOT NULL,
FOREIGN KEY (idUser) REFERENCES users(id)
);

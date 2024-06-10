
/* Remember to connect to DB before creating schema 
Schema is created inside a DB. If on console make sure you create DB first and conect to DB.
CREATE DATABASE unreg;
*/

CREATE SCHEMA unreg;



CREATE TABLE unreg.producers (
    telegram_user VARCHAR(255),
    owner_name VARCHAR(255) PRIMARY KEY,
    active_key VARCHAR(255),
    unreg_key VARCHAR(255),
    mainnet VARCHAR(255),
    testnet VARCHAR(255),
    enabled BOOLEAN DEFAULT FALSE,
    rounds_threshold INTEGER DEFAULT 1
);


CREATE USER unreguser WITH ENCRYPTED PASSWORD 'Nightshade900!';
GRANT ALL PRIVILEGES ON DATABASE unreg TO unreguser ;
GRANT ALL PRIVILEGES ON SCHEMA unreg TO unreguser ;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA unreg TO unreguser ;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA unreg TO unreguser ;

INSERT INTO unreg.producers (telegram_user, owner_name, active_key, unreg_key, mainnet, testnet, enabled, rounds_threshold) VALUES ('ankh2054', 'sentnlagents', 'PUB_K1_8FWK5oYydJUzfJeRZ64G8taTR1L3RTqpyaWdnaXtizh4JL8DUz', '5KCSJsUAyPwqVruBK6vrAapHhr9Uxu6zFQczsDbQCUYZeYZVoYV', 'sentnlagents', 'sentnlagents', true, 1);


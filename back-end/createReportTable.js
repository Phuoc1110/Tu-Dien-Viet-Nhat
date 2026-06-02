const { Sequelize, DataTypes } = require("sequelize");
const sequelize = new Sequelize("jp_dict", "root", null, {
  host: "127.0.0.1",
  dialect: "mysql"
});
async function run() {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS Reports (
        id INTEGER AUTO_INCREMENT PRIMARY KEY,
        reporterId INTEGER NOT NULL,
        targetType ENUM('comment', 'word', 'kanji') NOT NULL,
        targetId INTEGER NOT NULL,
        reason TEXT NOT NULL,
        status ENUM('pending', 'reviewed', 'resolved', 'dismissed') DEFAULT 'pending',
        resolvedBy INTEGER NULL,
        resolvedAt DATETIME NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (reporterId) REFERENCES Users(id) ON DELETE CASCADE,
        FOREIGN KEY (resolvedBy) REFERENCES Users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);
    console.log("Table created successfully");
  } catch(e) {
    console.error(e);
  } finally {
    await sequelize.close();
  }
}
run();

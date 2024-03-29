import { Sequelize } from "sequelize";

const sequelize = new Sequelize({
  dialect: "postgres",
  host: "localhost",
  username: "daara",
  password: "mdp",
  database: "user",
});

export default sequelize;

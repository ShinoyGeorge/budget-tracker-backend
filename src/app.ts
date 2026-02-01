import express, { Request, Response } from "express";
import userRoutes from "./modules/users/user.routes";
import {config} from "./config";
import {logger} from "./middleware/logger";

const app = express();

/*Middleware*/
/*body parser*/
app.use(express.json());
app.use(logger);

/*Routes*/
app.use("/users", userRoutes)
app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({ status: "OK" });
});


app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
});
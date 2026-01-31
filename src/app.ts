import express, { Request, Response } from "express";
import userRoutes from "./modules/users/user.routes";


const app = express();

app.use("/users", userRoutes)

app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({ status: "OK" });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

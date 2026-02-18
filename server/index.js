import express from "express";
import cors from "cors";
import chatRoutes from "./routes/chat.js";
import { initVectorDB } from "./services/vector.service.js";
import researchRoutes from "./routes/research.js";
const app = express();
app.use(express.json());
app.use(cors());

(async () => {
  await initVectorDB();
})();

app.use("/chat", chatRoutes); // ✅ only chat route needed now
app.use("/research", researchRoutes);
app.get("/", (req, res) => {
  res.send("Dupermemory API running");
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});

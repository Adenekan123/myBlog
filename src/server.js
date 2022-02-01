import express from "express";
import bodyParser from "body-parser";
import { MongoClient } from "mongodb";
import cors from "cors";
import path from "path";

const corsOptions = {
  origin: "http://localhost:8000",
};

const app = express();

app.use(express.static(path.join(__dirname, "/build")));
app.use(bodyParser.json());
app.use(cors(corsOptions));

const withDB = async (operations, res) => {
  try {
    const client = await MongoClient.connect("mongodb://localhost:27017", {
      useNewUrlParser: true,
    });
    const db = client.db("myBlog");

    await operations(db);

    client.close();
  } catch (err) {
    res.status(500).json({ message: "Error connecting to db", err });
  }
};

app.get("/api/articles/:name", async (req, res) => {
  await withDB(async (db) => {
    const { name: articleName } = req.params;
    const articleInfo = await db
      .collection("articles")
      .findOne({ name: articleName });
    res.status(200).json(articleInfo);
  }, res);
});

app.post("/api/articles/:name/upvotes", async (req, res) => {
  const { name: articleName } = req.params;

  withDB(async (db) => {
    const articleInfo = await db
      .collection("articles")
      .findOne({ name: articleName });

    //update articleInfo
    await db
      .collection("articles")
      .updateOne(
        { name: articleName },
        { $set: { upvotes: articleInfo.upvotes + 1 } }
      );

    const updatedArticleInfo = await db
      .collection("articles")
      .findOne({ name: articleName });

    res.status(200).json(updatedArticleInfo);
  });
});

app.post("/api/articles/:name/add-comment", (req, res) => {
  const { username, text } = req.body;
  const { name: articleName } = req.params;
  withDB(async (db) => {
    const articleInfo = await db
      .collection("articles")
      .findOne({ name: articleName });
    await db.collection("articles").updateOne(
      { name: articleName },
      {
        $set: {
          comments: articleInfo.comments.concat({ username, text }),
        },
      }
    );

    const updatedArticleInfo = await db
      .collection("articles")
      .findOne({ name: articleName });

    res.status(200).json(updatedArticleInfo);
  }, res);
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname + "/build/index.html"));
});

app.listen(8000, () => {
  console.log("listening on port 8000");
});

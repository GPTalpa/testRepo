import * as critical from "critical";
import fs from "fs";
import path from "path";

async function processPage(distDir, relPath = "index.html") {
  const filePath = path.join(distDir, relPath);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found, skipping: ${filePath}`);
    return;
  }

  const html = fs.readFileSync(filePath, "utf-8");

  // generate() возвращает объект; берем свойство html
  const result = await critical.generate({
    base: distDir + path.sep, // например "dist/" или "dist/go/"
    html,
    inline: true,
    width: 1300,
    height: 900,
    rebase: true, // пересчитываем пути к ассетам (fix: Not rebasing assets ...)
  });

  const outHtml =
    typeof result === "string" ? result : result.html || result.output || null;
  if (!outHtml) {
    throw new Error(
      "critical.generate returned unexpected result shape: " +
        JSON.stringify(Object.keys(result))
    );
  }

  fs.writeFileSync(filePath, outHtml, "utf-8");
  console.log(`Critical CSS injected into: ${filePath}`);
}

async function run() {
  try {
    // для корня
    await processPage("dist", "index.html");

    // для страницы go (у тебя в config путь "go/index.html")
    await processPage(path.join("dist", "go"), "index.html");

    console.log("All done.");
  } catch (err) {
    console.error("Critical processing error:", err);
    process.exitCode = 1;
  }
}

run();

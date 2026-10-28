import { Metadata, TweeJSON } from "./types.js";

export function convertTweeToJson(tweeContent: string): TweeJSON {
  const passages = [];
  const metadata: Metadata = {
    title: undefined,
    init: null,
  };
  let variables: any = {};
  for (const { name, tags, metadataString, content } of parsePassages(
    tweeContent,
  )) {
    const passageName = stripFirstBraceGroup(name).trim();
    const { cleanedContent, choices, comments } = processContent(content);
    const passageVariables = extractVariables(content);

    if (passageName === "StoryTitle") {
      metadata.title = cleanedContent.replace(":", "").trim();
    } else if (passageName === "StoryInit") {
      variables = passageVariables;
    } else if (passageName === "StoryData") {
      metadata.data = JSON.parse(cleanedContent.trim());
    } else {
      passages.push({
        name: passageName,
        metadata: metadataString ? JSON.parse(metadataString) : null,
        content: cleanedContent,
        choices,
        comments,
        variables: passageVariables,
        tags,
      });
    }
  }

  if (metadata.data?.start) {
    moveStartNodeToFront(passages, metadata.data.start);
  }

  return { metadata, variables, passages };
}

function skipWhitespace(text: string, from: number): number {
  let i = from;
  while (i < text.length && /\s/.test(text[i])) i++;
  return i;
}

function stripFirstBraceGroup(text: string): string {
  const open = text.indexOf("{");
  const close = open === -1 ? -1 : text.indexOf("}", open + 1);
  return close === -1 ? text : text.slice(0, open) + text.slice(close + 1);
}

function parseHeader(header: string) {
  const bracket = header.indexOf("[");
  if (bracket === 0 || header === "") return null;

  const name = bracket === -1 ? header : header.slice(0, bracket);
  const rest = bracket === -1 ? "" : header.slice(bracket);
  const tags: string[] = [];

  let i = 0;
  while (rest[i] === "[") {
    const close = rest.indexOf("]", i + 1);
    if (close === -1 || close === i + 1) break;
    tags.push(
      ...rest
        .slice(i + 1, close)
        .trim()
        .split(" "),
    );
    i = skipWhitespace(rest, close + 1);
  }

  const tail = rest.slice(i).trimEnd();
  const metadataString =
    tail.length > 1 && tail.startsWith("{") && tail.endsWith("}")
      ? tail
      : undefined;

  return { name, tags, metadataString };
}

function parsePassages(tweeContent: string) {
  const passages: {
    name: string;
    tags: string[];
    metadataString: string | undefined;
    content: string;
  }[] = [];
  let current: {
    header: ReturnType<typeof parseHeader>;
    lines: string[];
  } | null = null;

  const flush = () => {
    if (current?.header) {
      passages.push({
        ...current.header,
        content: current.lines.join("\n"),
      });
    }
  };

  for (const line of tweeContent.split("\n")) {
    if (line.startsWith("::")) {
      flush();
      current = line.startsWith(":: ")
        ? { header: parseHeader(line.slice(3)), lines: [] }
        : null;
    } else {
      current?.lines.push(line);
    }
  }
  flush();

  return passages;
}

function stripHtmlComments(content: string, comments: string[]): string {
  let result = content;
  let found = true;

  while (found) {
    found = false;
    let output = "";
    let i = 0;
    while (true) {
      const open = result.indexOf("<!--", i);
      const close = open === -1 ? -1 : result.indexOf("-->", open + 4);
      if (close === -1) break;
      comments.push(result.slice(open + 4, close).trim());
      output += result.slice(i, open);
      i = close + 3;
      found = true;
    }
    result = output + result.slice(i);
  }

  return result;
}

function findSetStatement(line: string) {
  const end = line.lastIndexOf(")");
  let from = 0;

  while (end !== -1) {
    const start = line.indexOf("(set:", from);
    if (start === -1) break;
    from = start + 1;

    let i = skipWhitespace(line, start + 5);
    if (line[i] !== "$") continue;
    const nameStart = ++i;
    while (i < line.length && /\w/.test(line[i])) i++;
    if (i === nameStart) continue;
    const name = line.slice(nameStart, i);

    i = skipWhitespace(line, i);
    if (!line.startsWith("to", i)) continue;
    i = skipWhitespace(line, i + 2);
    if (end < i) continue;

    return { start, end: end + 1, name, value: line.slice(i, end) };
  }

  return null;
}

function stripSetStatements(content: string): string {
  return content
    .split("\n")
    .map((line) => {
      const statement = findSetStatement(line);
      return statement
        ? line.slice(0, statement.start) + line.slice(statement.end)
        : line;
    })
    .join("\n");
}

function processContent(content: string) {
  const printPattern = /\(print:.*?\)/g;
  const comments: string[] = [];
  const choices: any[] = [];

  const cleanedContent = stripSetStatements(
    stripHtmlComments(content, comments),
  )
    .replace(printPattern, "")
    .trim();

  const finalContent = extractChoices(cleanedContent, choices);

  return { cleanedContent: finalContent, choices, comments };
}

function extractChoices(content: string, choices: any[]) {
  const lines = content.split("\n").map((line) => line.trim());
  let finalContent = content;

  lines.forEach((line) => {
    if (line === "[[]]") {
      choices.push({
        text: "",
        link: "",
      });
      finalContent = finalContent.replace(line, "").trim();
    } else {
      const choiceRegex = /\[\[(.*?)(?:\s*(\||->)\s*(.*?))?\]\]/g;
      const choiceMatch = choiceRegex.exec(line);
      if (choiceMatch) {
        const [content, text, delimeter, link] = choiceMatch;
        if (delimeter) {
          choices.push({
            text: text.trim(),
            link: link.trim(),
          });
        } else {
          choices.push({
            text: "",
            link: text.trim(),
          });
        }
        finalContent = finalContent.replace(content, "").trim();
      }
    }
  });

  return finalContent;
}

function extractVariables(content: string) {
  const passageVariables: { [key: string]: any } = {};

  for (const line of content.split("\n")) {
    const statement = findSetStatement(line);
    if (statement) {
      passageVariables[statement.name] = parseValue(statement.value.trim());
    }
  }

  return passageVariables;
}

function parseValue(value: string) {
  value = value.trim();

  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1); // Remove quotes
  }

  if (!isNaN(Number(value))) {
    return Number(value);
  }

  const datamapPattern = /\(datamap:\s*(.*?)\)/;
  if (datamapPattern.test(value)) {
    const datamapContent = value.match(datamapPattern)?.[1];
    if (datamapContent) {
      return parseDatamap(datamapContent);
    }
  }

  if (value === "true") return true;
  if (value === "false") return false;

  return value;
}

function parseDatamap(content: string) {
  const pairs = content.split(",").map((pair) => pair.trim());
  const datamap: { [key: string]: any } = {};

  for (let i = 0; i < pairs.length; i += 2) {
    const key = pairs[i].trim().replace(/"/g, "");
    const value = parseValue(pairs[i + 1].trim());
    datamap[key] = value;
  }

  return datamap;
}

function moveStartNodeToFront(passages: any[], startNodeName: string) {
  const startIndex = passages.findIndex(
    (passage) => passage.name === startNodeName,
  );
  if (startIndex > 0) {
    const [startNode] = passages.splice(startIndex, 1);
    passages.unshift(startNode);
  }
}

export * from "./types.js";

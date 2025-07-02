import { describe, it, expect } from "vitest";
import { convertTweeToJson } from "../src/index.js";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

describe("convertTweeToJson", () => {
  it("should convert a simple twee file to JSON", () => {
    const tweeContent = `:: StoryTitle
My Story

:: StoryData
{
    "start": "Start",
    "ifid": "12345678-1234-1234-1234-123456789012"
}

:: Start
This is the start of the story.

[[Go to next|Next]]

:: Next
This is the next passage.

[[Go back|Start]]`;

    const result = convertTweeToJson(tweeContent);

    expect(result.metadata.title).toBe("My Story");
    expect(result.metadata.data?.start).toBe("Start");
    expect(result.passages).toHaveLength(2);
    expect(result.passages[0].name).toBe("Start");
    expect(result.passages[0].content).toBe("This is the start of the story.");
    expect(result.passages[0].choices).toHaveLength(1);
    expect(result.passages[0].choices[0]).toEqual({
      text: "Go to next",
      link: "Next",
    });
  });

  it("should handle tags correctly", () => {
    const tweeContent = `:: StoryTitle
Tagged Story

:: Start [tag1 tag2]
This passage has tags.

[[Next|Next]]

:: Next [tag3]
This passage has different tags.`;

    const result = convertTweeToJson(tweeContent);

    expect(result.passages[0].tags).toEqual(["tag1", "tag2"]);
    expect(result.passages[1].tags).toEqual(["tag3"]);
  });

  it("should handle variables correctly", () => {
    const tweeContent = `:: StoryTitle
Variable Story

:: StoryInit
(set: $score to 0)
(set: $name to "Player")

:: Start
Your name is $name and your score is $score.

(set: $score to 5)

[[Next|Next]]

:: Next
Your score is now $score.`;

    const result = convertTweeToJson(tweeContent);

    expect(result.variables.score).toBe(0);
    expect(result.variables.name).toBe("Player");
    expect(result.passages[0].variables?.score).toBe(5);
  });

  it("should handle comments correctly", () => {
    const tweeContent = `:: StoryTitle
Comment Story

:: Start
This is the content.
<!-- This is a comment -->
More content.`;

    const result = convertTweeToJson(tweeContent);

    expect(result.passages[0].content).toBe(
      "This is the content.\n\nMore content.",
    );
    expect(result.passages[0].comments).toEqual(["This is a comment"]);
  });

  it("should handle empty choices", () => {
    const tweeContent = `:: StoryTitle
Empty Choice Story

:: Start
This is the content.

[[]]

:: Next
This is the next passage.`;

    const result = convertTweeToJson(tweeContent);

    expect(result.passages[0].choices).toHaveLength(1);
    expect(result.passages[0].choices[0]).toEqual({
      text: "",
      link: "",
    });
  });

  it("should handle datamaps correctly", () => {
    const tweeContent = `:: StoryTitle
Datamap Story

:: StoryInit
(set: $inventory to (datamap: "sword", "steel sword", "shield", "wooden shield"))

:: Start
You have a $inventory.sword and a $inventory.shield.`;

    const result = convertTweeToJson(tweeContent);

    expect(result.variables.inventory).toEqual({
      sword: "steel sword",
      shield: "wooden shield",
    });
  });

  it("should move start node to front", () => {
    const tweeContent = `:: StoryTitle
Start Node Story

:: StoryData
{
    "start": "Start"
}

:: Middle
This is in the middle.

:: Start
This is the start.

:: End
This is the end.`;

    const result = convertTweeToJson(tweeContent);

    expect(result.passages[0].name).toBe("Start");
    expect(result.passages[1].name).toBe("Middle");
    expect(result.passages[2].name).toBe("End");
  });

  it("should handle real twee file", () => {
    // Try multiple possible paths for the test data
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const possiblePaths = [
      join(currentDir, "data", "spy2.twee"),
      join(currentDir, "..", "__tests__", "data", "spy2.twee"),
      join(currentDir, "..", "..", "__tests__", "data", "spy2.twee"),
      join(currentDir, "..", "..", "..", "__tests__", "data", "spy2.twee"),
    ];

    let tweeContent: string;
    let found = false;

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        tweeContent = readFileSync(path, "utf-8");
        found = true;
        break;
      }
    }

    if (!found) {
      // Skip this test if we can't find the test data
      // This can happen in certain build environments
      console.warn("Skipping real twee file test - test data not found");
      return;
    }

    const result = convertTweeToJson(tweeContent!);

    expect(result.metadata.title).toBeDefined();
    expect(result.passages.length).toBeGreaterThan(0);
    expect(result.passages.every((p) => p.name)).toBe(true);
    expect(result.passages.every((p) => p.content)).toBe(true);
  });
});

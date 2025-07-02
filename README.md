# twee2json

A TypeScript library for converting Twine/Twee files to JSON format.

## Installation

```bash
npm install twee2json
```

## Usage

```typescript
import { convertTweeToJson } from "twee2json";

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
console.log(result);
```

## API

### `convertTweeToJson(tweeContent: string): TweeJSON`

Converts a Twee file content string to a structured JSON object.

#### Parameters

- `tweeContent` (string): The content of a Twee file

#### Returns

A `TweeJSON` object with the following structure:

```typescript
interface TweeJSON {
  metadata: Metadata;
  variables: { [key: string]: any };
  passages: Passage[];
}
```

## Types

### Metadata

```typescript
interface Metadata {
  title: string | undefined;
  init: Init | null;
  data?: StoryData | null;
}
```

### Passage

```typescript
interface Passage {
  name: string;
  metadata: Metadata | null;
  content: string;
  choices: Choice[];
  comments?: string[];
  variables?: { [key: string]: any };
  tags?: string[];
}
```

### Choice

```typescript
interface Choice {
  text: string;
  link: string;
}
```

## Features

- Parses Twee file format
- Extracts story metadata
- Processes passages and their content
- Handles choices and links
- Extracts variables and datamaps
- Processes tags and comments
- Moves start node to the front of passages array

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build the package
npm run build

# Lint code
npm run lint

# Format code
npm run format:fix
```

## License

MIT

import { parseCitations, renderTextWithCitations } from "../app/components/chat/InlineCitation";

describe("parseCitations", () => {
  it("should parse single citation", () => {
    const result = parseCitations("This is some text [1] with a citation.");
    expect(result).toEqual([
      { type: "text", content: "This is some text " },
      { type: "citation", content: "[1]", citationNumber: 1 },
      { type: "text", content: " with a citation." },
    ]);
  });

  it("should parse multiple citations", () => {
    const result = parseCitations("First [1] and second [2] citations.");
    expect(result).toEqual([
      { type: "text", content: "First " },
      { type: "citation", content: "[1]", citationNumber: 1 },
      { type: "text", content: " and second " },
      { type: "citation", content: "[2]", citationNumber: 2 },
      { type: "text", content: " citations." },
    ]);
  });

  it("should handle text without citations", () => {
    const result = parseCitations("No citations here.");
    expect(result).toEqual([{ type: "text", content: "No citations here." }]);
  });

  it("should handle citation at start of text", () => {
    const result = parseCitations("[1] starts with citation.");
    expect(result).toEqual([
      { type: "citation", content: "[1]", citationNumber: 1 },
      { type: "text", content: " starts with citation." },
    ]);
  });

  it("should handle citation at end of text", () => {
    const result = parseCitations("Ends with citation [1]");
    expect(result).toEqual([
      { type: "text", content: "Ends with citation " },
      { type: "citation", content: "[1]", citationNumber: 1 },
    ]);
  });

  it("should handle double-digit citation numbers", () => {
    const result = parseCitations("Reference [10] here.");
    expect(result).toEqual([
      { type: "text", content: "Reference " },
      { type: "citation", content: "[10]", citationNumber: 10 },
      { type: "text", content: " here." },
    ]);
  });

  it("should handle adjacent citations", () => {
    const result = parseCitations("Multiple [1][2][3] citations.");
    expect(result).toEqual([
      { type: "text", content: "Multiple " },
      { type: "citation", content: "[1]", citationNumber: 1 },
      { type: "citation", content: "[2]", citationNumber: 2 },
      { type: "citation", content: "[3]", citationNumber: 3 },
      { type: "text", content: " citations." },
    ]);
  });

  it("should not match non-numeric brackets", () => {
    const result = parseCitations("This [abc] is not a citation [1] but this is.");
    expect(result).toEqual([
      { type: "text", content: "This [abc] is not a citation " },
      { type: "citation", content: "[1]", citationNumber: 1 },
      { type: "text", content: " but this is." },
    ]);
  });

  it("should handle empty string", () => {
    const result = parseCitations("");
    expect(result).toEqual([]);
  });
});

describe("renderTextWithCitations", () => {
  const mockReferences = [
    { title: "First Paper", uri: "https://example.com/1.pdf", content: "Content 1" },
    { title: "Second Paper", uri: "https://example.com/2.pdf", content: "Content 2" },
  ];

  it("should return array of React nodes", () => {
    const result = renderTextWithCitations("Text [1] here", mockReferences, false);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3); // "Text ", citation, " here"
  });

  it("should handle text without citations", () => {
    const result = renderTextWithCitations("No citations", mockReferences, false);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
  });

  it("should handle undefined references", () => {
    const result = renderTextWithCitations("Text [1] here", undefined, false);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3);
  });
});

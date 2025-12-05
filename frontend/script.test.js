import {
  extensionOf,
  parseContainerSas,
  formatFileSize,
} from "./script";

test("extensionOf returns correct extensions", () => {
  expect(extensionOf("file.pdf")).toBe(".pdf");
  expect(extensionOf("track.MP3")).toBe(".mp3");
  expect(extensionOf("noext")).toBe("");
});

test("parseContainerSas splits SAS correctly", () => {
  const url = "https://test.blob.core.windows.net/uploads?abc123";
  expect(parseContainerSas(url)).toEqual({
    baseUrl: "https://test.blob.core.windows.net/uploads",
    sas: "abc123"
  });
});

test("formatFileSize converts bytes correctly", () => {
  expect(formatFileSize(1024)).toBe("1 KB");
  expect(formatFileSize(0)).toBe("0 Bytes");
  expect(formatFileSize(1048576)).toBe("1 MB");
});


# Requirements Document

## Introduction

This document defines the functionality for an Obsidian plugin that captures a selected markdown range, resolves any embedded media, and places a clipboard payload suitable for web article editors that expect rich text with inline images. The plugin targets authors who compose drafts in Obsidian and publish to web-based blogging services.

## Requirements

### Requirement 1

**User Story:** As an article author drafting in Obsidian, I want a command that copies my current selection with inline images, so that I can paste it into a web article editor without uploading images manually.

#### Acceptance Criteria

1. WHEN the user invokes the copy-as-article command on a selection containing markdown formatting THEN the system SHALL place both HTML and plain text representations on the clipboard.
2. WHEN the selection contains local image embeds referencing vault files THEN the system SHALL resolve each file path and embed the image content as inline clipboard data.
3. WHEN an embedded image exceeds the clipboard's size limit configured in settings THEN the system SHALL notify the user that the image could not be embedded and leave the previous clipboard contents untouched.
4. IF the selection contains unsupported embed types THEN the system SHALL copy the textual representation without crashing and SHALL warn the user.

### Requirement 2

**User Story:** As an article author collaborating across devices, I want pasted images to appear correctly in common browsers, so that the article editor immediately renders them without additional uploads.

#### Acceptance Criteria

1. WHEN the system writes images to the clipboard THEN the system SHALL include each image as PNG data with appropriate MIME metadata.
2. WHEN the system writes HTML clipboard content THEN the system SHALL reference embedded images using data URIs that match the corresponding clipboard image data.
3. WHEN the user pastes the clipboard content into a Chromium-based editor THEN the pasted result SHALL display all embedded images without placeholder icons.
4. IF the target editor rejects data URIs THEN the system SHALL fall back to copying markdown text only and SHALL inform the user via a notice.

### Requirement 3

**User Story:** As an article author managing media assets, I want feedback on unresolved images, so that I can fix missing files before publishing.

#### Acceptance Criteria

1. WHEN the system cannot find a referenced image file in the vault THEN the system SHALL list the missing filenames in an Obsidian notice.
2. WHEN an image embed is skipped due to encryption or permissions THEN the system SHALL indicate the reason in the notice message.
3. IF all embedded images resolve successfully THEN the system SHALL confirm completion with a success notice.
4. WHEN multiple issues occur during a single copy operation THEN the system SHALL aggregate the messages into a single notice.
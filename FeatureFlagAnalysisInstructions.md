# Feature Flag Analysis Instructions for Microsoft Edge

## Overview
This document provides comprehensive instructions for analyzing new Chromium feature flags discovered in Microsoft Edge builds. It covers the complete workflow from bug identification to implementation analysis.

## Default Configuration
When working with Azure DevOps:
- **Organization**: microsoft
- **Project**: Edge
- **Repository**: chromium.src
- **Repository ID**: a45cf45f-f6db-438b-baf7-da6b3de589ba

## Analysis Workflow

### 1. Bug Information Retrieval
Use Azure DevOps MCP to get bug details:
```
Get information about the bug using the bug ID to understand:
- Creation date and creator (usually Edge Experimentation Bot)
- Assigned team member
- Feature flag name and Edge version where discovered
- Priority and status
```

### 2. Feature Flag Location Discovery
Use Haystack search to locate feature flag definitions in the codebase:

**Search for feature flag definition:**
```
Use mcp_haystack-sear_HaystackSearch with the exact feature flag name
```

**Key files to examine:**
- Feature definition files (usually in `content/public/common/content_features.cc`)
- Header files (usually in `content/public/common/content_features.h`)
- Implementation files where the flag is used
- Test files for comprehensive understanding

### 3. Git Investigation Methodology
Follow this systematic approach to identify the original Chromium implementation:

**Step 1: Find the feature definition**
```bash
git grep "kFeatureFlagName" -- "*.cc" "*.h"
```

**Step 2: Use git blame to identify the introducing commit**
For PowerShell environments:
```powershell
git blame -L <start_line>,<end_line> <file_path>
```

**Step 3: Extract commit details**
```powershell
git show <commit_hash>
```

**Key information to extract from git show:**
- Original commit hash
- Author name and email
- Commit date
- Gerrit CL URL (format: https://chromium-review.googlesource.com/c/chromium/src/+/NNNNN)
- Chromium bug number
- Commit message

### 4. Feature Analysis Framework

**Technical Analysis:**
- **Default State**: Enabled/Disabled by default
- **Purpose**: What the feature controls or enables
- **Mechanism**: How the feature works internally
- **Dependencies**: Related features or requirements
- **Risk Assessment**: Potential stability or performance impacts

**Security Considerations:**
- Review if feature affects security boundaries
- Check for privacy implications
- Assess impact on existing security mechanisms

**Performance Impact:**
- Identify if feature introduces delays or overhead
- Check for platform-specific restrictions
- Review UMA metrics or telemetry implications

### 5. PowerShell Command Tips

**For PowerShell environments, use these equivalents:**
- Instead of `grep`: Use `Select-String` with `-Context` parameter
- For complex git blame: Use line ranges with `-L start,end`
- For searching within files: Use `Select-String` with pattern matching

**Example PowerShell commands:**
```powershell
# Search for feature flag with context
git blame content/public/common/content_features.cc | Select-String "FeatureFlagName" -Context 2

# Get specific line ranges
git blame -L 270,275 content/public/common/content_features.cc

# Search git log for related commits
git log --oneline --grep="FeatureName" -n 10
```

### 6. Documentation Template

**Feature Flag Investigation Report Structure:**
```markdown
# Investigation of [FeatureName] Feature Flag in Microsoft Edge

## Context
- Date: [Analysis Date]
- Bug ID: [ADO Bug Number]
- Feature: [Feature Flag Name]
- Edge Version: [Version where discovered]

## Bug Summary
[Summary from ADO including status, assignee, area path]

## Feature Flag Location & Implementation
**Files:**
- Definition: [file_path] (Lines X-Y)
- Declaration: [header_file] (Lines X-Y)
- Usage: [implementation_files]

## Functionality
- **Purpose**: [What the feature does]
- **Default State**: [Enabled/Disabled by default]
- **Mechanism**: [How it works]
- **Dependencies**: [Related features]
- **Risk Assessment**: [Potential impacts]

## Original Chromium Implementation
- **Original Commit**: [commit_hash]
- **Author**: [author_name] <[email]>
- **Date**: [commit_date]
- **Gerrit CL**: https://chromium-review.googlesource.com/c/chromium/src/+/[CL_number]
- **Chromium Bug**: [chromium_bug_number]
- **Commit Message**: [commit_message]

## Recommendations
[Actions for Edge team: monitor, disable, investigate further, etc.]
```

### 7. Key Investigation Questions
For each feature flag analysis, address:

1. **Technical Questions:**
   - What is the purpose of this feature?
   - How does it affect existing functionality?
   - What are the performance implications?
   - Are there platform-specific considerations?

2. **Risk Assessment:**
   - Does this feature pose stability risks?
   - Are there security implications?
   - Could this impact Edge-specific functionality?

3. **Action Items:**
   - Should Edge team monitor this feature's lifecycle?
   - Should the feature be disabled in Edge?
   - Are there Edge-specific adaptations needed?

### 8. Tools and Resources

**Primary Tools:**
- Azure DevOps MCP for bug information
- Haystack search for code location
- Git blame/show for commit history
- PowerShell for Windows environments

**Useful Resources:**
- W3C specifications for web features
- Chromium developer documentation
- Edge Experimentation Bot notifications
- ExpInsights for feature flag monitoring

### 9. Common Patterns

**Typical Feature Flag Categories:**
- **Experimental Features**: New web platform capabilities
- **Performance Studies**: A/B testing for performance optimization
- **Security Features**: Enhanced security mechanisms
- **Deprecation Flags**: Phasing out legacy functionality
- **Platform Integration**: OS-specific feature implementations

**Edge-Specific Considerations:**
- Integration with Microsoft services
- Enterprise policy compatibility
- Windows platform optimizations
- Privacy and security enhancements

## Example Analysis: DeviceBoundSessionTerminationEvictBackForwardCache

**Bug**: 56394749 - Feature flag discovered in Edge 135.0.3160.0
**Location**: `content/public/common/content_features.cc` (Lines 271-273)
**Original Commit**: `03e719955f8e4ab2d64cdce02a86c88f520203d4`
**Author**: Daniel Rubery <drubery@chromium.org>
**Gerrit CL**: https://chromium-review.googlesource.com/c/chromium/src/+/6198936
**Purpose**: Security feature to evict BFCache pages when device bound sessions terminate
**Default State**: Disabled by default
**Assessment**: Low risk, security enhancement, no immediate action required

This example demonstrates the complete analysis workflow from bug discovery to implementation understanding and risk assessment.

### 10. ADO Work Item Comment Guidelines

After completing the feature flag analysis, add a professional comment to close out the ADO work item:

**Comment Structure:**
- **Feature Analysis Summary**: Brief explanation of what the feature flag controls
- **Key Details**: Include upstream Chromium CL, default state, and purpose
- **Risk Assessment**: Security benefit, risk level, and performance impact
- **Recommendation**: Clear action items for the Edge team
- **Resolution**: Recommendation to mark as "Won't Fix" if no action needed

**HTML Formatting for ADO:**
Use HTML formatting for better presentation in Azure DevOps:

```html
<h2>Investigation Complete - [FeatureFlagName]</h2>

<div class="section">
    <p><strong>Feature Analysis Summary:</strong><br/>
    [Brief explanation of what the feature controls and what Device Bound Session Credentials are if relevant]</p>
</div>

<div class="section">
    <p><strong>Key Details:</strong></p>
    <ul>
        <li><strong>Upstream Chromium CL:</strong> <a href="[CL_URL]" target="_blank">[CL_URL]</a></li>
        <li><strong>Default State:</strong> [Enabled/Disabled by default]</li>
        <li><strong>Purpose:</strong> [Security enhancement/Performance study/etc.]</li>
    </ul>
</div>

<div class="section">
    <p><strong>Risk Assessment:</strong></p>
    <ul>
        <li><strong>Risk Level:</strong> [Low/Medium/High] - [Brief explanation]</li>
        <li><strong>Security Benefit:</strong> [High/Medium/Low] - [Brief explanation]</li>
        <li><strong>Performance Impact:</strong> [Minimal/Moderate/Significant] - [Brief explanation]</li>
    </ul>
</div>

<div class="section">
    <p><strong>Recommendation:</strong><br/>
    [Clear recommendation: No immediate action required/Monitor/Disable/etc.]</p>
</div>

<div class="section">
    <p><strong>Resolution:</strong> Marking as <strong>Won't Fix</strong> per the investigation guidelines - [brief reason]</p>
</div>
```

**Essential Elements to Include:**
1. **Upstream Chromium CL link** - Direct link to the original Chromium change
2. **Concise explanation** of what the feature flag controls (1-2 sentences)
3. **Brief explanation** of technical concepts (e.g., Device Bound Session Credentials)
4. **Clear risk assessment** with specific levels (Low/Medium/High)
5. **Actionable recommendation** for the Edge team
6. **Resolution guidance** based on investigation findings

**Example Comment Elements:**
- "This feature flag controls the eviction of pages with `cache-control:no-store` headers..."
- "Device Bound Session Credentials are a web security mechanism designed to prevent session hijacking..."
- "Risk Level: Low - Feature is disabled by default with no immediate impact"
- "No immediate action required. This is a security enhancement that poses no risk to Edge."

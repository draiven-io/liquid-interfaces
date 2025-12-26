# Contributing to Liquid Interfaces

Thank you for your interest in contributing to Liquid Interfaces! This document provides guidelines and processes for contributing to the project.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Ways to Contribute](#ways-to-contribute)
3. [Getting Started](#getting-started)
4. [Contribution Process](#contribution-process)
5. [RFC Process](#rfc-process)
6. [Style Guidelines](#style-guidelines)
7. [Review Process](#review-process)
8. [Community](#community)

---

## Code of Conduct

All contributors are expected to follow our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before participating.

---

## Ways to Contribute

### Specification Development

- Propose new specifications via [RFCs](../rfcs/README.md)
- Review and provide feedback on existing RFCs
- Help refine and clarify existing specifications

### Documentation

- Improve existing documentation
- Add examples and use cases
- Fix typos and clarify language
- Translate documentation

### Reference Implementations

- Build implementations of the specifications
- Report compatibility issues
- Share implementation experiences

### Community

- Answer questions in discussions
- Help newcomers understand the project
- Share use cases and feedback
- Spread the word

---

## Getting Started

### 1. Understand the Project

Before contributing, please familiarize yourself with:

- [The Manifesto](../README.md) - Core principles
- [Architecture Overview](../docs/overview.md) - How things fit together
- [Glossary](../docs/glossary.md) - Key terminology

### 2. Find Something to Work On

- Check [open issues](../../issues) for tasks
- Look for issues labeled `good first issue` or `help wanted`
- Review open [RFCs](../rfcs/) for discussion opportunities

### 3. Set Up Your Environment

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/YOUR_USERNAME/liquid-interfaces.git
cd liquid-interfaces

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_ORG/liquid-interfaces.git
```

---

## Contribution Process

### For Documentation and Minor Changes

1. **Fork & Clone** the repository
2. **Create a branch** for your changes
   ```bash
   git checkout -b docs/improve-overview
   ```
3. **Make your changes** following our style guidelines
4. **Commit** with a clear message
   ```bash
   git commit -m "docs: clarify semantic matching process"
   ```
5. **Push** to your fork
   ```bash
   git push origin docs/improve-overview
   ```
6. **Open a Pull Request** against `main`

### For Specification Changes

Significant changes to specifications require the [RFC process](#rfc-process).

---

## RFC Process

Substantial changes to specifications go through our Request for Comments (RFC) process.

### When is an RFC Required?

- New specifications or major features
- Changes that affect multiple specifications
- Breaking changes to existing specifications
- New concepts or terminology

### RFC Workflow

1. **Draft** - Create an RFC using the [template](../rfcs/0000-template.md)
2. **Discuss** - Open a PR and gather feedback
3. **Revise** - Iterate based on community input
4. **Accept/Reject** - Maintainers make final decision
5. **Implement** - Accepted RFCs are implemented

See [RFC README](../rfcs/README.md) for detailed instructions.

---

## Style Guidelines

### Documentation

- Use clear, concise language
- Write in present tense
- Use active voice
- Include examples where helpful
- Follow Markdown best practices

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `spec:` - Specification changes
- `docs:` - Documentation changes
- `rfc:` - RFC-related changes
- `fix:` - Bug fixes
- `chore:` - Maintenance tasks

**Examples:**
```
spec(lip): add clarification request message type
docs(glossary): add semantic observability definition
rfc: propose view versioning strategy
```

### Specification Writing

- Be precise and unambiguous
- Define terms before using them
- Use consistent terminology
- Include rationale for decisions
- Provide examples
- Consider edge cases

---

## Review Process

### Pull Request Reviews

1. All PRs require at least one maintainer approval
2. Specification changes require broader review
3. Reviews focus on:
   - Correctness and clarity
   - Consistency with existing specs
   - Completeness
   - Examples and edge cases

### What to Expect

- **Response Time**: We aim to respond within 1 week
- **Feedback**: May request changes or clarification
- **Iteration**: Complex changes may need multiple rounds
- **Decision**: Maintainers make final decisions

### Tips for Successful PRs

- Keep changes focused and atomic
- Provide context in the PR description
- Reference related issues or RFCs
- Be responsive to feedback
- Be patient with the process

---

## Community

### Getting Help

- **Discussions**: Use GitHub Discussions for questions
- **Issues**: Use issues for bugs or specific tasks
- **RFCs**: Use RFCs for proposals

### Communication Guidelines

- Be respectful and constructive
- Assume good intentions
- Focus on ideas, not individuals
- Welcome newcomers
- Share knowledge generously

---

## Recognition

Contributors are recognized in:
- Release notes
- The CONTRIBUTORS file (for significant contributions)
- Community acknowledgments

---

## Questions?

If you have questions about contributing, please:
1. Check existing documentation
2. Search closed issues and discussions
3. Open a new discussion if needed

Thank you for helping make Liquid Interfaces better! 🌊

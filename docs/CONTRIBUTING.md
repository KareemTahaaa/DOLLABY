# Contributing to Dollaby

We welcome contributions! This document provides guidelines for participating in the Dollaby project.

## 🎯 Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on ideas, not individuals
- Help others learn and grow

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a feature branch**: `git checkout -b feature/your-feature-name`
4. **Make your changes** following the guidelines below
5. **Commit** with clear messages: `git commit -m "Add feature: description"`
6. **Push** to your fork: `git push origin feature/your-feature-name`
7. **Create a Pull Request** with a detailed description

## 📋 Development Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## ✅ Code Standards

### Python Backend

- **Style**: Follow [PEP 8](https://www.python.org/dev/peps/pep-0008/)
- **Formatting**: Use `black` for automatic formatting
- **Linting**: Run `flake8` for code quality
- **Type Hints**: Use type annotations where possible
- **Docstrings**: Add docstrings to functions and classes

```bash
# Format code
black backend/

# Check linting
flake8 backend/
```

### Frontend (TypeScript/React)

- **Style**: Consistent with ESLint config
- **Formatting**: Use Prettier
- **Type Safety**: Leverage TypeScript strictly
- **Components**: Use functional components with hooks
- **Naming**: Use PascalCase for components, camelCase for functions/variables

```bash
# Lint
npm run lint

# Format (if prettier configured)
npm run format
```

## 🧪 Testing Requirements

### Backend Tests

```bash
cd backend
pytest

# With coverage
pytest --cov=.
```

New features should include:
- Unit tests for business logic
- Integration tests for database operations
- API endpoint tests

### Frontend Tests

```bash
cd frontend
npm test

# Watch mode
npm test -- --watch
```

## 📝 Commit Message Format

Follow this format for clear commit history:

```
[type]: Brief description

Longer explanation if needed. Explain:
- What changed
- Why it changed
- Any side effects or breaking changes

Fixes #123
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test additions/changes
- `chore`: Build, dependencies, etc.

**Examples:**
```
feat: Add outfit recommendation based on weather

docs: Update API documentation for closet endpoints

fix: Correct MongoDB connection timeout issue

test: Add unit tests for outfit generator service
```

## 🔍 Pull Request Process

1. **Update documentation** if adding new features
2. **Add tests** for new functionality
3. **Run tests locally** to ensure they pass
4. **Update CHANGELOG** if applicable
5. **Request reviews** from maintainers
6. **Address feedback** promptly

### PR Title Format

```
[Type] Brief description
```

Examples:
- `[feat] Add virtual try-on improvements`
- `[fix] Resolve MongoDB connection issue`
- `[docs] Update installation guide`

### PR Description Template

```markdown
## Description
Brief summary of changes.

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Documentation update
- [ ] Breaking change

## How to Test
Steps to verify the changes:
1. Step one
2. Step two

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Code follows style guidelines
- [ ] No new warnings generated
```

## 🚫 What We Won't Accept

- API keys or sensitive data in commits
- Large binary files or datasets
- Unrelated changes in one PR
- Changes without tests
- Documentation without code changes

## 📚 Project Structure

Familiarize yourself with:
- `backend/` — FastAPI application code
- `frontend/` — Next.js application code
- `docker-compose.yml` — Container orchestration
- `ARCHITECTURE.md` — System design documentation

## 🔒 Security

- Never commit `.env` files with real credentials
- Use `.env.example` for configuration templates
- Report security vulnerabilities privately (don't open public issues)
- Validate all user input
- Keep dependencies updated

## 📞 Questions?

- Check existing issues and discussions
- Review documentation in `README.md` and `ARCHITECTURE.md`
- Ask in pull request comments
- Respect maintainers' time

## 🎓 Learning Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Guide](https://docs.mongodb.com/)
- [Python Best Practices](https://pep8.org/)
- [React Hooks Guide](https://react.dev/reference/react)

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Dollaby! 🚀**

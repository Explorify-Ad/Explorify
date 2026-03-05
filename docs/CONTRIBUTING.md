# 🤝 Contributing Guidelines

## Getting Started

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Submit a pull request

## Code Style

### JavaScript
- Use **2 spaces** for indentation
- Use **semicolons** at the end of statements
- Use **single quotes** for strings
- Add **JSDoc comments** for all functions
- Use **camelCase** for variables and functions
- Use **PascalCase** for React components

### Example

```javascript
/**
 * Calculate the distance between two coordinates using the Haversine formula.
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  // implementation
};
```

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style changes (formatting, etc.) |
| `refactor` | Code refactoring |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks |

### Examples

```
feat(mobile): add landmark detail screen
fix(backend): correct distance calculation in route service
docs: update API documentation with new endpoints
test(backend): add unit tests for route service
```

## Branch Naming

```
<type>/<short-description>
```

### Examples

```
feature/map-integration
bugfix/login-redirect
hotfix/api-cors
docs/setup-guide
```

## Pull Request Process

1. **Create a PR** with a clear description of changes
2. **Fill out the PR template** completely
3. **Link related issues** using `Closes #123`
4. **Request review** from at least one team member
5. **Address review comments** before merging
6. **Squash and merge** to keep history clean

## Testing

- Write tests for all new features
- Ensure all existing tests pass
- Aim for meaningful test coverage
- Test edge cases and error handling

## Code Review Checklist

- [ ] Code follows project style guidelines
- [ ] Functions have JSDoc documentation
- [ ] No console.log statements left in production code
- [ ] Error handling is implemented
- [ ] No hardcoded values (use constants or env variables)
- [ ] Security considerations addressed

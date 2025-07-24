# Release Setup

This project uses [semantic-release](https://github.com/semantic-release/semantic-release) for automated versioning and publishing.

## Configuration Files

- `.releaserc.json` - Main semantic-release configuration
- `.github/workflows/release.yml` - GitHub Actions workflow for automated releases
- `CHANGELOG.md` - Auto-generated changelog (updated by semantic-release)

## Required Secrets

To enable automated publishing, you need to set up the following secrets in your GitHub repository:

1. **GITHUB_TOKEN** - Automatically provided by GitHub Actions
2. **NPM_TOKEN** - Your npm authentication token

### Setting up NPM_TOKEN

1. Create an npm access token:
   ```bash
   npm login
   npm token create --read-only
   ```

2. Add the token to your GitHub repository secrets:
   - Go to your repository settings
   - Navigate to Secrets and variables > Actions
   - Add a new secret named `NPM_TOKEN` with your npm token value

## How It Works

1. **Commit Analysis**: semantic-release analyzes commit messages to determine the next version
2. **Version Bumping**: 
   - `feat:` commits trigger minor version bumps
   - `fix:` commits trigger patch version bumps
   - `BREAKING CHANGE:` commits trigger major version bumps
3. **Release Process**:
   - Updates version in `package.json`
   - Generates release notes
   - Updates `CHANGELOG.md`
   - Publishes to npm
   - Creates GitHub release

## Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### Breaking Changes

To indicate a breaking change, add `BREAKING CHANGE:` to the commit body:

```
feat: add new API

BREAKING CHANGE: The old API has been removed
```

## Local Testing

To test semantic-release locally (without publishing):

```bash
npm run release
```

Note: This requires proper GitHub authentication and may fail locally due to token restrictions.

## Troubleshooting

- **Authentication errors**: Ensure `NPM_TOKEN` is set in GitHub secrets
- **Version conflicts**: Remove the `version` field from `package.json` (semantic-release manages it)
- **Git errors**: Ensure the repository has proper access and the main branch is correctly configured 
# Releasing `liquid-interfaces`

## Versioning

The **minor** version tracks the LIP version implemented: `0.2.x` implements
LIP 0.2.0. Patches are package fixes that change no protocol behaviour.

This is a real constraint, not a convention — a user reading `0.2.1` should be
able to conclude which protocol version it speaks without checking anything.
A change that implements a new protocol version bumps the minor, even if the
diff is small.

## The first publish

npm Trusted Publishing has to be configured against a package that already
exists, and there is no pending-publisher equivalent to PyPI's. So the first
release is published by hand, once:

```bash
npm login
```

```bash
npm publish --provenance --access public --workspace liquid-interfaces
```

Then configure trusted publishing at
`https://www.npmjs.com/package/liquid-interfaces/access`:

| | |
|---|---|
| Organization | `draiven-io` |
| Repository | `liquid-interfaces` |
| Workflow | `release-npm.yml` |
| Environment | `npm` |

After that, delete any `NPM_TOKEN` secret from the repository — with trusted
publishing configured, a long-lived token is a credential with nothing left to
do, and the workflow stops needing it.

## Every release after that

1. Bump `version` in `packages/liquid-interfaces/package.json`.
2. Update the changelog.
3. Merge to `main`.
4. Tag and push:

```bash
git tag ts-v0.2.1 && git push origin ts-v0.2.1
```

The tag is prefixed `ts-` because this repository also carries the
specification, which is versioned separately from the client implementing it.

The workflow refuses to publish if the tag and `package.json` disagree. That
check exists because npm will not let you republish a version to correct it —
the mistake is permanent, and the only fix is burning a version number.

## Checking a release before tagging

Run the release workflow manually with **Dry run** left on. It builds,
typechecks, tests and runs `npm publish --dry-run`, which reports exactly what
would be uploaded without uploading it.

"""Package the readable HTML pages and assets without regenerating their content."""

from pathlib import Path
import shutil


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"


def main():
    """Copy public website files into the deployment directory."""
    pages = sorted(ROOT.glob("*.html"))
    if not pages or not (ROOT / "index.html").is_file():
        raise SystemExit("Cannot build: the website HTML pages are missing.")

    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()

    for page in pages:
        shutil.copy2(page, DIST / page.name)
    shutil.copytree(ROOT / "assets", DIST / "assets")

    print(f"Packaged {len(pages)} HTML pages and assets in dist/.")


if __name__ == "__main__":
    main()

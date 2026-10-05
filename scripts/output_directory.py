"""Validation commune des dossiers de sortie des exports Python."""

from __future__ import annotations

from pathlib import Path


PROJECT_DIRECTORY = Path(__file__).resolve().parents[1]


def resolve_external_output_directory(value: str | Path | None) -> Path:
    """Require an explicit destination outside the application's repository."""

    if value is None or not str(value).strip():
        raise ValueError("Un dossier de sortie externe est obligatoire (--output).")
    output = Path(value).expanduser().resolve()
    if output.is_relative_to(PROJECT_DIRECTORY):
        raise ValueError(f"Le dossier de sortie doit être hors du projet : {output}")
    if output.exists() and not output.is_dir():
        raise ValueError(f"Le chemin de sortie n'est pas un dossier : {output}")
    return output

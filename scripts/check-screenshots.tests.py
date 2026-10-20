"""Tests for check-screenshots.py. Run: python3 scripts/check-screenshots.tests.py"""

import importlib.util
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("check_screenshots", HERE / "check-screenshots.py")
check = importlib.util.module_from_spec(spec)
spec.loader.exec_module(check)


class CoverageTests(unittest.TestCase):
    def test_a_new_screen_without_a_shot_is_uncovered(self):
        coverage = {"library": ["library-grid-recent"], "serie": ["gone"]}
        shots = {"library-grid-recent", "home"}
        self.assertEqual(check.uncovered_screens(screens=["library", "serie", "novel-screen"], coverage=coverage,
                                                 shot_names=shots), ["serie", "novel-screen"])

    def test_coverage_pointing_at_nothing_is_reported(self):
        out = check.unknown_coverage(coverage={"library": ["ghost"], "old": ["home"]}, shot_names={"home"},
                                     screens={"library"})
        self.assertEqual(sorted(out), ["library: ghost", "old: (no such screen folder)"])

    def test_missing_images(self):
        self.assertEqual(check.missing_images(shot_names=["a", "b"], existing={"a.png", "c.png"}), ["b"])


class ThemeTests(unittest.TestCase):
    def test_every_theme_needs_every_themed_shot(self):
        by_theme = {"crimson-oled": {"home.png", "config-main.png"}, "amber": {"home.png"}}
        out = check.missing_theme_images(themed=["home", "config-main"], keys=["amber", "crimsonOled", "wine"],
                                         existing_by_theme=by_theme)
        self.assertEqual(out, {"amber": ["config-main"], "wine": ["home", "config-main"]})

    def test_a_theme_that_was_removed_leaves_a_stale_folder(self):
        self.assertEqual(check.stale_themes(keys=["amber"], existing_by_theme={"amber": set(), "olive": set()}),
                         ["olive"])


class StalenessTests(unittest.TestCase):
    def test_code_newer_than_images_is_stale_but_unknowns_are_not(self):
        self.assertTrue(check.changed_after(code_ts=200, image_ts=100))
        self.assertFalse(check.changed_after(code_ts=100, image_ts=200))
        self.assertFalse(check.changed_after(code_ts=0, image_ts=100))
        self.assertFalse(check.changed_after(code_ts=100, image_ts=0))


class RepoTests(unittest.TestCase):
    def test_the_repo_reads_without_crashing(self):
        errors, warnings = check.check()
        self.assertIsInstance(errors, list)
        self.assertIsInstance(warnings, list)


if __name__ == "__main__":
    unittest.main()

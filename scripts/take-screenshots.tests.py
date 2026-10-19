"""Tests for take-screenshots.py. Run: python3 scripts/take-screenshots.tests.py"""

import importlib.util
import json
import unittest
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("take_screenshots", HERE / "take-screenshots.py")
shots = importlib.util.module_from_spec(spec)
spec.loader.exec_module(shots)

DUMP = """<?xml version='1.0' encoding='UTF-8' standalone='yes' ?>
<hierarchy rotation="0">
  <node text="" resource-id="" class="android.view.ViewGroup" content-desc="Home" clickable="true" bounds="[0,2463][180,2595]"/>
  <node text="Home" resource-id="" class="android.widget.TextView" content-desc="" clickable="false" bounds="[41,2546][139,2595]"/>
  <node text="" resource-id="com.mymangareader:id/rail-wide-card" class="android.view.ViewGroup" content-desc="Obra X" clickable="true" bounds="[48,499][948,907]"/>
  <node text="" resource-id="" class="android.view.ViewGroup" content-desc="Capa" clickable="true" bounds="[48,1064][384,1732]"/>
  <node text="sem limites" resource-id="" class="android.view.View" content-desc="" clickable="false" bounds="garbage"/>
</hierarchy>"""


class ParsingTests(unittest.TestCase):
    def test_parse_bounds(self):
        self.assertEqual(shots.parse_bounds(text="[1,2][30,40]"), (1, 2, 30, 40))
        self.assertIsNone(shots.parse_bounds(text="garbage"))
        self.assertIsNone(shots.parse_bounds(text=None))

    def test_parse_nodes_skips_unboundable_and_strips_package_from_id(self):
        nodes = shots.parse_nodes(xml=DUMP)
        self.assertEqual(len(nodes), 4)
        self.assertEqual(nodes[2]["id"], "rail-wide-card")
        self.assertTrue(nodes[0]["clickable"])

    def test_foreign_focus_detects_an_alarm_over_the_app(self):
        app = ["Window{d7b95c9 u0 com.mymangareader/com.mymangareader.MainActivity}\n  mFocusedApp=x", "null\n"]
        alarm = ["Window{a1 u0 com.sec.android.app.clockpackage/.alarm.AlarmAlertActivity}\n", "null\n"]
        self.assertIsNone(shots.foreign_focus(focus_lines=app))
        self.assertIn("clockpackage", shots.foreign_focus(focus_lines=alarm))
        self.assertIsNone(shots.foreign_focus(focus_lines=["null\n", "null\n"]))
        self.assertIsNone(shots.foreign_focus(focus_lines=[]))

    def test_extract_png_drops_adb_warning(self):
        data = b"[Warning] Multiple displays were found\n" + shots.PNG_SIGNATURE + b"rest"
        self.assertEqual(shots.extract_png(data=data), shots.PNG_SIGNATURE + b"rest")
        with self.assertRaises(shots.ScriptError):
            shots.extract_png(data=b"no image here")

    def test_parse_display_ids_main_first(self):
        text = ('Display 4630946592180194435 (HWC display 0): port=131 pnpId=QCM\n'
                'Display 4630947181303254916 (HWC display 3): port=132 pnpId=QCM\n')
        self.assertEqual(shots.parse_display_ids(text=text),
                         ["4630946592180194435", "4630947181303254916"])

    def test_pick_serial_takes_first_and_ignores_offline(self):
        out = ("List of devices attached\n"
               "adb-AAA (2)._adb-tls-connect._tcp device product:b5qxxx\n"
               "adb-AAA._adb-tls-connect._tcp device product:b5qxxx\n")
        self.assertEqual(shots.pick_serial(devices_output=out), "adb-AAA (2)._adb-tls-connect._tcp")
        self.assertEqual(
            shots.pick_serial(devices_output="List of devices attached\nX offline\nY device\n"), "Y")
        with self.assertRaises(shots.ScriptError):
            shots.pick_serial(devices_output="List of devices attached\n\n")


class SelectorTests(unittest.TestCase):
    def setUp(self):
        self.nodes = shots.parse_nodes(xml=DUMP)

    def test_desc_is_substring_and_clickable_filters(self):
        hits = shots.find(nodes=self.nodes, selector={"desc": "Home", "clickable": True})
        self.assertEqual([n["box"] for n in hits], [(0, 2463, 180, 2595)])

    def test_id_is_exact(self):
        self.assertEqual(len(shots.find(nodes=self.nodes, selector={"id": "rail-wide-card"})), 1)
        self.assertEqual(len(shots.find(nodes=self.nodes, selector={"id": "rail"})), 0)

    def test_min_size_picks_covers_only(self):
        hits = shots.find(nodes=self.nodes, selector={"clickable": True, "min_size": [250, 250]})
        self.assertEqual(len(hits), 2)

    def test_item_regions_cover_and_title_only(self):
        row = """<hierarchy>
          <node text="" class="android.view.ViewGroup" content-desc="Minha Obra Secreta" clickable="true" bounds="[0,0][900,234]"/>
          <node text="" class="android.widget.ImageView" content-desc="" clickable="false" bounds="[0,0][150,234]"/>
          <node text="Minha Obra Secreta" class="android.widget.TextView" content-desc="" clickable="false" bounds="[170,0][700,100]"/>
          <node text="90/90 caps." class="android.widget.TextView" content-desc="" clickable="false" bounds="[170,110][400,160]"/>
          <node text="" class="android.view.ViewGroup" content-desc="Home" clickable="true" bounds="[0,2463][180,2595]"/>
          <node text="" class="com.horcrux.svg.SvgView" content-desc="" clickable="false" bounds="[40,2470][140,2540]"/>
          <node text="Home" class="android.widget.TextView" content-desc="" clickable="false" bounds="[41,2546][139,2595]"/>
        </hierarchy>"""
        regions = shots.item_regions(nodes=shots.parse_nodes(xml=row))
        self.assertEqual(regions["covers"], [(0, 0, 150, 234)])
        self.assertEqual(regions["titles"], [(170, 0, 700, 100)])

    def test_item_regions_row_clipped_by_screen_edge_stays_inside_the_item(self):
        row = """<hierarchy>
          <node text="" class="android.view.ViewGroup" content-desc="Obra Cortada" clickable="true" bounds="[0,2300][900,2460]"/>
          <node text="" class="android.widget.ImageView" content-desc="" clickable="false" bounds="[0,2300][150,2534]"/>
          <node text="Obra Cortada" class="android.widget.TextView" content-desc="" clickable="false" bounds="[170,2300][700,2408]"/>
        </hierarchy>"""
        regions = shots.item_regions(nodes=shots.parse_nodes(xml=row))
        self.assertEqual(regions["covers"], [(0, 2300, 150, 2460)])
        self.assertEqual(regions["titles"], [(170, 2300, 700, 2408)])

    def test_item_regions_narrow_peeking_card_counts(self):
        card = """<hierarchy>
          <node text="" class="android.view.ViewGroup" content-desc="Título Muito Longo, Próximo: Cap. 1" clickable="true" bounds="[984,499][1080,907]"/>
          <node text="" class="android.widget.ImageView" content-desc="" clickable="false" bounds="[1000,520][1080,700]"/>
        </hierarchy>"""
        self.assertEqual(shots.item_regions(nodes=shots.parse_nodes(xml=card))["covers"], [(1000, 520, 1080, 700)])

    def test_item_regions_title_truncated_with_ellipsis(self):
        card = """<hierarchy>
          <node text="" class="android.view.ViewGroup" content-desc="Título Muito Longo, Próximo: Cap. 1" clickable="true" bounds="[0,0][336,668]"/>
          <node text="" class="android.widget.ImageView" content-desc="" clickable="false" bounds="[0,0][336,480]"/>
          <node text="Título Muito…" class="android.widget.TextView" content-desc="" clickable="false" bounds="[0,500][336,590]"/>
        </hierarchy>"""
        self.assertEqual(shots.item_regions(nodes=shots.parse_nodes(xml=card))["titles"], [(0, 500, 336, 590)])

    def test_item_regions_ignores_buttons_without_a_cover(self):
        btn = """<hierarchy>
          <node text="" class="android.widget.Button" content-desc="Filtrar" clickable="true" bounds="[714,130][774,190]"/>
          <node text="" class="com.horcrux.svg.SvgView" content-desc="" clickable="false" bounds="[714,130][774,190]"/>
        </hierarchy>"""
        self.assertEqual(shots.item_regions(nodes=shots.parse_nodes(xml=btn)), {"covers": [], "titles": []})

    def test_center(self):
        self.assertEqual(shots.center(box=(0, 2463, 180, 2595)), (90, 2529))


class ImageTests(unittest.TestCase):
    def test_blur_changes_only_the_box_and_clamps(self):
        image = Image.new("RGB", (100, 100), "white")
        for x in range(40, 60):
            for y in range(40, 60):
                image.putpixel((x, y), (0, 0, 0))
        shots.blur_regions(image=image, boxes=[(30, 30, 70, 70), (90, 90, 500, 500), (10, 10, 10, 50)])
        self.assertNotEqual(image.getpixel((41, 41)), (0, 0, 0))
        self.assertEqual(image.getpixel((5, 5)), (255, 255, 255))

    def test_mask_status_bar_keeps_size_and_hides_top(self):
        image = Image.new("RGB", (50, 200), (10, 20, 30))
        for x in range(50):
            for y in range(20):
                image.putpixel((x, y), (255, 0, 0))
        shots.mask_status_bar(image=image, height=20)
        self.assertEqual(image.size, (50, 200))
        self.assertEqual(image.getpixel((10, 5)), (10, 20, 30))

    def test_mask_status_bar_zero_is_noop(self):
        image = Image.new("RGB", (10, 10), (1, 2, 3))
        shots.mask_status_bar(image=image, height=0)
        self.assertEqual(image.getpixel((0, 0)), (1, 2, 3))


class ReplacementTests(unittest.TestCase):
    def test_default_cover_has_the_requested_size(self):
        self.assertEqual(shots.default_cover(size=(156, 234)).size, (156, 234))

    def test_replace_cover_paints_the_box_only_and_clamps(self):
        image = Image.new("RGB", (100, 100), (255, 0, 0))
        shots.replace_cover(image=image, box=(10, 10, 60, 500))
        self.assertNotEqual(image.getpixel((30, 30)), (255, 0, 0))
        self.assertEqual(image.getpixel((5, 5)), (255, 0, 0))
        self.assertEqual(image.getpixel((80, 30)), (255, 0, 0))

    def test_text_colors_finds_background_and_ink(self):
        image = Image.new("RGB", (60, 20), (10, 10, 30))
        for x in range(10, 20):
            for y in range(5, 15):
                image.putpixel((x, y), (250, 250, 250))
        self.assertEqual(shots.text_colors(image=image, box=(0, 0, 60, 20)), ((10, 10, 30), (250, 250, 250)))

    def test_replace_title_erases_the_original_and_draws_lorem(self):
        image = Image.new("RGB", (400, 120), (10, 10, 30))
        for x in range(10, 300):
            for y in range(10, 40):
                image.putpixel((x, y), (250, 250, 250))
        shots.replace_title(image=image, box=(0, 0, 400, 104))
        # the solid white band is gone: text is drawn over a background again, not a filled block
        band = [image.getpixel((x, y)) for x in range(10, 300) for y in range(10, 40)]
        self.assertLess(band.count((250, 250, 250)) / len(band), 0.9)
        self.assertIn((10, 10, 30), band)
        self.assertEqual(image.size, (400, 120))

    def test_wrap_lorem_respects_line_count_and_width(self):
        font = shots.load_bold_font(size=30)
        lines = shots.wrap_lorem(font=font, width=300, lines=2)
        self.assertEqual(len(lines), 2)
        self.assertTrue(all(font.getlength(line) <= 300 for line in lines))
        self.assertTrue(lines[0].startswith("Lorem ipsum"))
        self.assertEqual(len(shots.wrap_lorem(font=font, width=300, lines=1)), 1)


class ScriptTests(unittest.TestCase):
    def test_committed_script_is_valid(self):
        script = json.loads(shots.SCRIPT.read_text())
        self.assertTrue(shots.validate_script(script=script)["shots"])

    def test_expand_steps_resolves_nested_snippets_and_rejects_cycles(self):
        script = {"snippets": {"a": [{"launch": True}, {"use": "b"}], "b": [{"wait": 1}], "loop": [{"use": "loop"}]}}
        steps = shots.expand_steps(script=script, shot={"name": "x", "steps": [{"use": "a"}, {"shot": "x"}]})
        self.assertEqual([list(s)[0] for s in steps], ["launch", "wait", "shot"])
        with self.assertRaises(shots.ScriptError):
            shots.expand_steps(script=script, shot={"name": "x", "steps": [{"use": "loop"}]})
        with self.assertRaises(shots.ScriptError):
            shots.expand_steps(script=script, shot={"name": "x", "steps": [{"use": "nope"}]})

    def test_rejects_bad_names_duplicates_and_missing_final_shot(self):
        def one(*, name="a", steps=None):
            return {"shots": [{"name": name, "steps": steps or [{"launch": True}, {"shot": name}]}]}

        shots.validate_script(script=one())
        with self.assertRaises(shots.ScriptError):
            shots.validate_script(script=one(name="Bad Name"))
        with self.assertRaises(shots.ScriptError):
            shots.validate_script(script=one(steps=[{"launch": True}]))
        with self.assertRaises(shots.ScriptError):
            shots.validate_script(script=one(steps=[{"launch": True, "tap": {}}, {"shot": "a"}]))
        dup = {"shots": one()["shots"] * 2}
        with self.assertRaises(shots.ScriptError):
            shots.validate_script(script=dup)


if __name__ == "__main__":
    unittest.main()

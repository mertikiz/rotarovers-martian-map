"""Checks for layers.py on synthetic grids. Run from the repo root: python -m pytest pipeline -q"""
import math

import numpy as np
import rasterio
from affine import Affine

import layers as L

EQUATOR = Affine(5.0, 0, 0, 0, -5.0, 0)   # 5 m cells at the equator: no longitude correction


def test_flat_ground_gets_the_same_shade_everywhere():
    hs = L.hillshade(np.zeros((20, 20)), EQUATOR)
    assert np.allclose(hs, math.sin(math.radians(45.0)) * 255)


def test_a_slope_facing_the_light_is_brighter_than_one_facing_away():
    rows = np.arange(30)[:, None] * np.ones((1, 30))
    cols = np.ones((30, 1)) * np.arange(30)[None, :]
    facing_nw = rows * 1.0 + cols * 1.0      # height grows towards south-east: the face looks north-west
    facing_se = -facing_nw
    assert L.hillshade(facing_nw, EQUATOR)[10:20, 10:20].mean() > L.hillshade(facing_se, EQUATOR)[10:20, 10:20].mean()


def test_slope_overlay_colours_each_class_and_leaves_gentle_ground_transparent():
    slope = np.array([[5.0, 17.0, 25.0, np.nan]])
    rgba = L.slope_rgba(slope)
    assert rgba.shape == (4, 1, 4)
    assert rgba[3, 0, 0] == 0                                   # under 15 deg: transparent
    assert tuple(rgba[:, 0, 1]) == L.SLOPE_CLASSES[0][1]        # 15-20 deg: amber
    assert tuple(rgba[:, 0, 2]) == L.SLOPE_CLASSES[1][1]        # over 20 deg: red
    assert rgba[3, 0, 3] == 0                                   # no data: transparent


def test_write_png_round_trips_the_bands(tmp_path):
    bands = np.stack([np.full((3, 4), v) for v in (10, 20, 30, 255)])
    out = tmp_path / "x.png"
    L.write_png(out, bands)
    with rasterio.open(out) as ds:
        assert ds.count == 4 and ds.width == 4 and ds.height == 3
        assert (ds.read() == bands).all()
    assert not (tmp_path / "x.png.aux.xml").exists()

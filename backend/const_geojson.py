import json
from collections import defaultdict
from shapely.geometry import Polygon, mapping

def parse(path):
    polys = defaultdict(list)
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = line.split()
            if len(parts) < 3:
                continue
            try:
                ra_h = float(parts[0])
                dec_d = float(parts[1])
                names = parts[2:]

                ra_deg = ra_h * 15
                point = (ra_deg, dec_d)

                # add point to every constellation name on the line
                for name in names:
                    polys[name].append(point)
            except ValueError:
                continue
    return polys


def valid_const(polys_dict):
    features = []
    for code, points in polys_dict.items():
        if len(points) < 3:
            print(f'Skip {code}: <3 points ({len(points)})')
            continue

        not_dupe = []
        for pt in points:
            if not not_dupe or pt != not_dupe[-1]:
                not_dupe.append(pt)

        if len(not_dupe) < 3:
            print(f'Skip {code}: <3 after dedupe')
            continue

        if not_dupe[0] != not_dupe[-1]:
            not_dupe.append(not_dupe[0])

        try:
            poly = Polygon(not_dupe)
            if not poly.is_valid:
                poly = poly.buffer(0)  # attempt to fix geometry
            if poly.is_valid and poly.area:
                feature = {
                    'type': 'Feature',
                    'properties': {'iau': code},
                    'geometry': mapping(poly),
                }
                features.append(feature)
            else:
                print(f'Skip {code}: invalid polygon or zero area')
        except Exception as e:
            print('error', code, e)
    return features

if __name__ == '__main__':
    polys = parse('frontend/data/constbnd.dat')
    features = valid_const(polys)
    geojson = {
        'type': 'FeatureCollection',
        'features': features,
    }

    with open('frontend/data/const.geojson', 'w', encoding='utf-8') as f:
        json.dump(geojson, f, indent=2)
    print('Uploaded')
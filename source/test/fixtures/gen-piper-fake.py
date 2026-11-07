"""07.11 piper.test.mjs: маленькая ONNX-модель с входами голоса Piper (input, input_lengths, scales → output [1,1,1,T]) и её .onnx.json.
Настоящий голос (63 МБ, Hugging Face) из облака не скачать; движок берётся из npm:
  npm pack onnxruntime-web@1.18.0 → <dir>/ort/package/dist ;  npm pack @diffusionstudio/piper-wasm@1.0.0 → <dir>/wasm/package/build
Run: pip install onnx && python3 gen-piper-fake.py <dir>   →  <dir>/fake/ru_RU-irina-medium.onnx(.json);  потом RQ_PIPER_DIR=<dir> node piper.test.mjs"""
import json, os, sys
import onnx
from onnx import helper as h, TensorProto as T
out = os.path.join(sys.argv[1] if len(sys.argv) > 1 else '.', 'fake'); os.makedirs(out, exist_ok=True)
C = lambda n, t, d, v: h.make_node('Constant', [], [n], value=h.make_tensor(n, t, d, v))
nodes = [h.make_node('Shape', ['input'], ['shp']), C('one', T.INT64, [1], [1]), h.make_node('Gather', ['shp', 'one'], ['n'], axis=0),
  C('k', T.INT64, [1], [256]), h.make_node('Mul', ['n', 'k'], ['len1']), C('z', T.INT64, [], [0]), C('st', T.INT64, [], [1]),
  h.make_node('Squeeze', ['len1', 'zero1'], ['len']), h.make_node('Range', ['z', 'len', 'st'], ['r']), h.make_node('Cast', ['r'], ['rf'], to=T.FLOAT),
  C('w', T.FLOAT, [], [0.06]), h.make_node('Mul', ['rf', 'w'], ['ph']), h.make_node('Sin', ['ph'], ['s']), C('amp', T.FLOAT, [], [0.3]),
  h.make_node('Mul', ['s', 'amp'], ['o1']), C('sh', T.INT64, [4], [1, 1, 1, -1]), h.make_node('Reshape', ['o1', 'sh'], ['output'])]
g = h.make_graph(nodes, 'fakevits', [h.make_tensor_value_info('input', T.INT64, [1, None]), h.make_tensor_value_info('input_lengths', T.INT64, [1]), h.make_tensor_value_info('scales', T.FLOAT, [3])],
  [h.make_tensor_value_info('output', T.FLOAT, [1, 1, 1, None])], initializer=[h.make_tensor('zero1', T.INT64, [1], [0])])
m = h.make_model(g, opset_imports=[h.make_opsetid('', 13)]); m.ir_version = 8; onnx.checker.check_model(m)
onnx.save(m, os.path.join(out, 'ru_RU-irina-medium.onnx'))
json.dump({"audio": {"sample_rate": 22050}, "espeak": {"voice": "ru"}, "inference": {"noise_scale": 0.667, "length_scale": 1, "noise_w": 0.8}, "speaker_id_map": {}, "num_speakers": 1},
  open(os.path.join(out, 'ru_RU-irina-medium.onnx.json'), 'w'))
print('ok', out)

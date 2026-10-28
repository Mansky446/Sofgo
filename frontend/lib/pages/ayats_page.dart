import 'dart:collection';
import 'dart:convert';
import 'dart:typed_data';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart';
import 'package:sofgo/models/ayat.dart';
import 'package:sofgo/models/surah_prev.dart';

class _AyatStreamData {
  Ayat data;
  Uint8List ?audioBuffer;
  Future<void>? future;

  _AyatStreamData(this.data);

  void clearAudio() {
    audioBuffer = null;
  }
}

class _AyatWidget extends StatefulWidget {
  final Ayat? data;
  const _AyatWidget(this.data);
  
  @override
  State<StatefulWidget> createState() => _AyatWidgetState();
}

class _AyatWidgetState extends State<_AyatWidget> {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsetsGeometry.all(20),
      child:  SizedBox(
        width: double.infinity,
        child: Column(
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              spacing: 10,
              children: [
                Container(
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.black, width: 1.5),
                    borderRadius: BorderRadius.circular(24)
                  ),
                  width: 48,
                  height: 48,
                  alignment: Alignment.center,
                  child: Text(widget.data == null ? "" : "${widget.data!.no}", style: TextStyle(fontSize: 16)),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        widget.data?.arabText ?? "",
                        style: TextStyle(fontSize: 24),
                        textDirection: TextDirection.rtl,
                        textAlign: TextAlign.right,
                      )
                    ],
                  ),
                ),
              ],
            ),
            SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                spacing: 4,
                children: [
                  Text(widget.data?.text ?? "", style: TextStyle(fontSize: 16)),
                  Text(widget.data?.indoText ?? "", style: TextStyle(fontSize: 14))
                ],
              )
            )
          ],
        )
      ),
    );
  }
}

class AyatsPage extends StatefulWidget {
  final SurahPrev data;
  const AyatsPage({super.key, required this.data});

  @override
  State<AyatsPage> createState() => _AyatsPageState();
}

enum _AudioStreamState {
  play,
  pause,
  pauseCompleted,
  stop
}

class _AyatsPageState extends State<AyatsPage> {
  AudioPlayer _player = AudioPlayer();
  List<Ayat?> _ayats = [];
  int _fetchedCount = 0;
  bool _streamMode = false;

  Queue<_AyatStreamData> _prevs = Queue();
  Queue<_AyatStreamData> _nexts = Queue();
  _AyatStreamData? _current;

  double _streamSliderValue = 0;
  bool _streamSliderOnSlide = false;
  Duration _currentDuration = Duration.zero;
  Duration _currentPosition = Duration.zero;

  _AudioStreamState _state = _AudioStreamState.stop;

  Future<Uint8List?> fetchAudio(int id) async {
    final url = Uri.parse("http://127.0.0.1:4020/stream-ayat/$id");
    final res = await get(url);

    if (res.statusCode == 200) {
      return res.bodyBytes;
    }
    return null;
  }

  Future<void> fetchNextData() async {
    final url = Uri.parse("http://127.0.0.1:4020/surah/${widget.data.id}/ayat?from=$_fetchedCount");
    final res = await get(url);

    if (!mounted) {
      return;
    }

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      int nextFetchedCount = data["fetchedCount"];

      for (var ayat in data["data"]) {
        _ayats[ayat["no"] - 1] = Ayat(
          ayat["id"],
          ayat["no"],
          ayat["text"],
          ayat["arabText"],
          ayat["indoText"]
        );
      }

      _fetchedCount += nextFetchedCount;
    } else {
      print(res.body);
    }
    setState(() {});
    if (_fetchedCount < widget.data.ayatCount) {
      fetchNextData();
    }
  }

  Future<void> fetchInitData() async {
    final url = Uri.parse("http://127.0.0.1:4020/surah/${widget.data.id}/init-ayat");
    final res = await get(url);

    if (!mounted) {
      return;
    }

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);

      _fetchedCount = data["fetchedCount"];
      _ayats = List.filled(widget.data.ayatCount, null);

      for (var ayat in data["data"]) {
        _ayats[ayat["no"] - 1] = Ayat(
          ayat["id"],
          ayat["no"],
          ayat["text"],
          ayat["arabText"],
          ayat["indoText"]
        );
      }
    } else {
      print(res.body);
    }
    setState(() {});
    fetchNextData();
  }

  Future<void> fetchNextAudio(_AyatStreamData ayatStream) async {
    Uint8List? buffer = await fetchAudio(ayatStream.data.id);
    if (!mounted) {
      return;
    }
    ayatStream.audioBuffer = buffer;
    ayatStream.future = null;
  }

  Future<void> startPrevAudio() async {
    late _AyatStreamData streamData;

    if (_prevs.isEmpty) {
      streamData = _AyatStreamData(_ayats[_current!.data.no - 2]!);
      Uint8List? buffer = await fetchAudio(streamData.data.id);
      if (!mounted) {
        return;
      }
      if (buffer == null) {
        return;
      }
      streamData.audioBuffer = buffer;
    } else {
      streamData = _prevs.removeLast();
    }

    _nexts.addFirst(_current!);
    _current = streamData;

    if (_nexts.length > 3) {
      _nexts.removeLast();
    }

    await _player.play(BytesSource(streamData.audioBuffer!));
  }

  Future<void> startNextAudio() async {
    if (_nexts.isEmpty) {
      return;
    }
    _AyatStreamData streamData = _nexts.removeFirst();

    if (streamData.audioBuffer != null) {
      await _player.setSourceBytes(streamData.audioBuffer!);
      if (!mounted) {
        return;
      }
    } else if (streamData.future != null) {
      await streamData.future!;
      if (!mounted) {
        return;
      }
      if (streamData.audioBuffer == null) {
        return;
      }
    } else {
      return;
    }

    _prevs.add(_current!);
    _current = streamData;
    
    if (_prevs.length > 3) {
      _prevs.removeFirst();
    }

    if (_nexts.isEmpty) {
      for (int i = streamData.data.no, lastI = streamData.data.no + 2 < widget.data.ayatCount ? streamData.data.no + 2 : widget.data.ayatCount; i < lastI; i++) {
        _AyatStreamData streamData = _AyatStreamData(_ayats[i]!);
        streamData.future = fetchNextAudio(streamData);
        _nexts.add(streamData);
      }
    } else {
      _AyatStreamData lastStreamData = _nexts.last;
      if (lastStreamData.data.no < widget.data.ayatCount && _nexts.length < 3) {
        _AyatStreamData newStreamData = _AyatStreamData(_ayats[_nexts.last.data.no]!);
        newStreamData.future = fetchNextAudio(newStreamData);
        _nexts.add(newStreamData);
      }
    }
    
    await _player.play(BytesSource(streamData.audioBuffer!));
  }

  Future<void> startAudio(Ayat ayat) async {
    bool lastCurrentIsNull = _current == null;
    _current = _AyatStreamData(ayat);
    setState(() {});

    if (lastCurrentIsNull) {
      Uint8List? buffer = await fetchAudio(ayat.id);
      if (!mounted) {
        return;
      }
      if (buffer == null) {
        return;
      }
      _current!.audioBuffer = buffer;
      await _player.setSourceBytes(buffer);
      if (!mounted) {
        return;
      }
      await _player.resume();
      if (!mounted) {
        return;
      }

      for (int i = ayat.no, lastI = ayat.no + 2 < widget.data.ayatCount ? ayat.no + 2 : widget.data.ayatCount; i < lastI; i++) {
        _AyatStreamData streamData = _AyatStreamData(_ayats[i]!);
        streamData.future = fetchNextAudio(streamData);
        _nexts.add(streamData);
      }
    }
  }

  @override
  void initState() {
    super.initState();
    fetchInitData();

    _player.setReleaseMode(ReleaseMode.release);

    _player.onDurationChanged.listen((duration) {
      if (!mounted) {
        return;
      }
      _currentDuration = duration;
      if (duration.compareTo(Duration.zero) == 0) {
        _streamSliderValue = 0;
      }
      setState(() {});
    });

    _player.onPositionChanged.listen((position) {
      if (!mounted) {
        return;
      }
      _currentPosition = position;
      if (!_streamSliderOnSlide) {
        _streamSliderValue = position.inMilliseconds.toDouble();
      }
      setState(() {});
    });

    _player.onPlayerStateChanged.listen((state) {
      if (!mounted) {
        return;
      }
      
      switch (state) {
        case PlayerState.playing:
          _state = _AudioStreamState.play;
          break;
        case PlayerState.paused:
          _state = _AudioStreamState.pause;
          break;
        case PlayerState.completed:
          _state = _AudioStreamState.pauseCompleted;
          _streamSliderValue = 0;
          if (_nexts.isNotEmpty) {
            startNextAudio();
          }
          break;
        default:
          return;
      }
      setState(() {});
    });
  }

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.data.name),
            Text("${widget.data.ayatCount} Ayat", style: TextStyle(fontSize: 12))
          ],
        ),
        actions: [
          IconButton(
            onPressed: () {
              _streamMode = !_streamMode;
              setState(() {});
            },
            icon: Icon(_streamMode ? Icons.headset : Icons.article)
          ),
          IconButton(onPressed: () {}, icon: Icon(Icons.play_lesson)),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              itemCount: _ayats.length,
              itemBuilder: (context, index) {
                return _AyatWidget(_ayats[index]);
              },
            )
          ),
          if (_streamMode) ...[
            Padding(
              padding: EdgeInsetsGeometry.all(10),
              child: Column(
                children: [
                  Text("Ayat ${_current?.data.no ?? "-"}/${widget.data.ayatCount}"),
                  Row(
                    spacing: 10,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      IconButton(
                        onPressed: _state == _AudioStreamState.stop || _current!.data.no == 1 ? null : () {
                          startPrevAudio();
                        },
                        icon: Icon(Icons.skip_previous),
                      ),
                      IconButton(
                        onPressed: _fetchedCount == 0 ? null : 
                          _state == _AudioStreamState.stop ?
                            () {
                              startAudio(_ayats[0]!);
                            } : _state == _AudioStreamState.pause ?
                            () {
                              _player.resume();
                            } :
                            () {
                              _player.pause();
                            },
                        icon: Icon(_state == _AudioStreamState.play ? Icons.pause : Icons.play_arrow),
                      ),
                      IconButton(
                        onPressed: _state == _AudioStreamState.stop || (_current?.data.no ?? widget.data.ayatCount) == widget.data.ayatCount ? null : () {
                          startNextAudio();
                        },
                        icon: Icon(Icons.skip_next),
                      )
                    ],
                  ),
                  Row(
                    spacing: 5,
                    children: [
                      SizedBox(
                        width: 48,
                        child: Center(
                          child: Text("${_currentPosition.inMinutes.remainder(60).toString().padLeft(2, '0')}:${_currentPosition.inSeconds.remainder(60).toString().padLeft(2, '0')}"),
                        )
                      ),
                      Expanded(
                        child: SliderTheme(
                          data: SliderTheme.of(context).copyWith(
                            trackHeight: 6,
                            thumbShape: const RoundSliderThumbShape(
                              enabledThumbRadius: 6
                            ),
                            overlayShape: const RoundSliderThumbShape(
                              enabledThumbRadius: 0
                            )
                          ),
                          child: Slider(
                            value: _streamSliderValue,
                            min: 0,
                            max: _currentDuration.compareTo(Duration.zero) == 0 ? 1 : _currentDuration.inMilliseconds.toDouble(),
                            onChanged: _state == _AudioStreamState.stop ? null :
                              _state == _AudioStreamState.play ?
                                (value) {
                                  _streamSliderValue = value;
                                } : 
                                (value) {
                                  _streamSliderValue = value;
                                  setState(() {});
                                },
                            onChangeStart:(value) {
                              _streamSliderOnSlide = true;
                            },
                            onChangeEnd: (value) async {
                              if (!_streamSliderOnSlide) {
                                return;
                              }
                              await _player.seek(Duration(milliseconds: _streamSliderValue.floor()));
                              if (mounted) {
                                _streamSliderOnSlide = false;
                              }
                            },
                          ),
                        ),
                      ),
                      SizedBox(
                        width: 48,
                        child: Center(
                          child: Text("${_currentDuration.inMinutes.remainder(60).toString().padLeft(2, '0')}:${_currentDuration.inSeconds.remainder(60).toString().padLeft(2, '0')}"),
                        )
                      ),
                    ],
                  )
                ],
              )
            )
          ]
        ],
      )
    );
  }
}
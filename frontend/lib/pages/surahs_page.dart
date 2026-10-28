import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart';
import 'package:sofgo/models/surah_prev.dart';
import 'package:sofgo/pages/ayats_page.dart';

class _SurahWidget extends StatefulWidget {
  final SurahPrev? data;
  const _SurahWidget(this.data);

  @override
  State<_SurahWidget> createState() => _SurahWidgetState();
}

class _SurahWidgetState extends State<_SurahWidget> {
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        if (widget.data == null) {
          return;
        }
        Navigator.of(context).push(MaterialPageRoute(builder: (context) => AyatsPage(data: widget.data!)));
      },
      child: Padding(
        padding: EdgeInsetsGeometry.all(20),
        child:  SizedBox(
          width: double.infinity,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            spacing: 20,
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
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(widget.data?.name ?? "", style: TextStyle(fontSize: 22)),
                    Text(widget.data == null ? "" : "${widget.data!.ayatCount} Ayat", style: TextStyle(fontSize: 11))
                  ],
                ),
              ),
              Text(
                widget.data?.arabName ?? "",
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.w500),
                textDirection: TextDirection.rtl,
                textAlign: TextAlign.right,
              ),
            ],
          )
        ),
      )
    );
  }
}

class SurahsPage extends StatefulWidget {
  const SurahsPage({super.key});

  @override
  State<SurahsPage> createState() => _SurahsPageState();
}

class _SurahsPageState extends State<SurahsPage> {
  List<SurahPrev?> _surahs = [];
  int _surahCount = 0;
  int _fetchedCount = 0;

  Future<void> fetchNextData() async {
    final url = Uri.parse("http://127.0.0.1:4020/surah?from=$_fetchedCount");
    final res = await get(url);

    if (!mounted) {
      return;
    }

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      int nextFetchedCount = data["fetchedCount"];

      for (var surah in data["data"]) {
        _surahs[surah["id"]] = SurahPrev(
          surah["id"],
          surah["no"],
          surah["name"],
          surah["arabName"],
          surah["ayatCount"],
        );
      }

      _fetchedCount += nextFetchedCount;
    } else {
      print(res.body);
    }
    setState(() {});
    if (_fetchedCount < _surahCount) {
      fetchNextData();
    }
  }

  Future<void> fetchInitData() async {
    final url = Uri.parse("http://127.0.0.1:4020/init-surah");
    final res = await get(url);

    if (!mounted) {
      return;
    }

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);

      _surahCount = data["surahCount"];
      _fetchedCount = data["fetchedCount"];
      _surahs = List.filled(_surahCount, null);

      for (var surah in data["data"]) {
        _surahs[surah["id"]] = SurahPrev(
          surah["id"],
          surah["no"],
          surah["name"],
          surah["arabName"],
          surah["ayatCount"],
        );
      }
    } else {
      print(res.body);
    }
    setState(() {});
    fetchNextData();
  }

  @override
  void initState() {
    super.initState();
    fetchInitData();
  }

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: _surahCount,
      itemBuilder: (context, index) {
        return _SurahWidget(_surahs[index]);
      },
    );
  }
}
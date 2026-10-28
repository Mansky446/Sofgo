import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart';
import 'package:sofgo/models/login_session.dart';
import 'package:sofgo/pages/login_page.dart';
import 'package:sofgo/pages/surahs_page.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<StatefulWidget> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  FlutterSecureStorage storage = FlutterSecureStorage();
  int _index = 0;
  LoginSession? loginSession;

  final List<Widget> pages = [
    SurahsPage(),
    Column(),
    Column()
  ];

  Future<void> initSession() async {
    String? rawId = await storage.read(key: "id");
    if (rawId == null) {
      return;
    }

    String? sessionId = await storage.read(key: "sessionId");
    if (sessionId == null) {
      return;
    }

    final url = Uri.parse("http://127.0.0.1:4020/login");
    try {
      final res = await post(
        url,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: {
          "id": rawId,
          "sessionId": sessionId
        }
      );
      if (!mounted) {
        return;
      }
      
      if (res.statusCode == 200) {
        loginSession = LoginSession(int.parse(rawId), sessionId);
        setState(() {});
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Anda sudah terhubung ke akun"), duration: Durations.long3));
      }
    } catch (e) {
      return;
    }
  }

  Future<void> changeLoginSession(LoginSession newLoginSession) async {
    await storage.write(key: "id", value: newLoginSession.id.toString());
    await storage.write(key: "sessionId", value: newLoginSession.sessionId);
    loginSession = newLoginSession;
  }

  @override
  void initState() {
    super.initState();
    initSession();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text("Sofgo"),
        actions: [
          loginSession == null ?
            IconButton(
              onPressed: () {
                Navigator.of(context).push(MaterialPageRoute(builder: (context) => LoginPage(changeLoginSession: changeLoginSession)));
              },
              icon: Icon(Icons.login)
            ) :
            IconButton(
              onPressed: () {
                
              },
              icon: Icon(Icons.account_balance)
            ),
          
        ],
      ),
      body: pages[_index],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _index,
        onTap:(value) {
          setState(() {
            _index = value;
          });
        },
        items: [
          BottomNavigationBarItem(
            icon: Icon(Icons.menu_book),
            label: "Surah",
            tooltip: "Daftar surah"
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.favorite),
            label: "Favorit",
            tooltip: "Daftar ayat favorit"
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.bookmark),
            label: "Penanda",
            tooltip: "Daftar penanda"
          )
        ],
      ),
    );
  }
}
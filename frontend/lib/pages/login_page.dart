import 'package:flutter/material.dart';
import 'package:sofgo/models/login_session.dart';

class FormTextInput extends StatefulWidget {
  final String label;
  final IconData icon;
  final TextEditingController controller;
  final String? placeholder;
  final String? errorMessage;
  final TextInputAction? textInputAction;

  const FormTextInput({
    super.key,
    required this.label,
    required this.icon,
    required this.controller,
    this.placeholder,
    this.errorMessage,
    this.textInputAction
  });

  @override
  State<FormTextInput> createState() => _FormTextInputState();
}

class _FormTextInputState extends State<FormTextInput> {
  String? currentErrorMessage;

  @override
  void initState() {
    super.initState();
    currentErrorMessage = widget.errorMessage;
  }

  @override
  void didUpdateWidget(covariant FormTextInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (currentErrorMessage != widget.errorMessage) {
      currentErrorMessage = widget.errorMessage;
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        spacing: 8,
        children: [
          Text(widget.label, style: TextStyle(fontSize: 16)),
          DecoratedBox(
            decoration: BoxDecoration(
              border: BoxBorder.all(color: Colors.black, width: 2),
              borderRadius: BorderRadiusGeometry.circular(8),
            ),
            child: Padding(
              padding: EdgeInsetsGeometry.symmetric(vertical: 2, horizontal: 14),
              child: Row(
                spacing: 12,
                children: [
                  Icon(widget.icon, size: 20),
                  Expanded(
                    child: TextField(
                      controller: widget.controller,
                      style: TextStyle(fontSize: 14),
                      textInputAction: widget.textInputAction,
                      decoration: InputDecoration(
                        hint: widget.placeholder == null ? null : Text(widget.placeholder!),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.zero
                      ),
                    ),
                  )
                ],
              ),
            )
          ),
          if (currentErrorMessage != null)
            Text(currentErrorMessage!)
        ],
      ),
    );
  }
}

class FormPasswordInput extends StatefulWidget {
  final String label;
  final IconData icon;
  final TextEditingController controller;
  final String? placeholder;
  final String? errorMessage;
  final TextInputAction? textInputAction;

  const FormPasswordInput({
    super.key,
    required this.label,
    required this.icon,
    required this.controller,
    this.placeholder,
    this.errorMessage,
    this.textInputAction
  });

  @override
  State<FormPasswordInput> createState() => _FormPasswordInputState();
}

class _FormPasswordInputState extends State<FormPasswordInput> {
  String? currentErrorMessage;
  bool isHidden = true;

  @override
  void initState() {
    super.initState();
    currentErrorMessage = widget.errorMessage;
  }

  @override
  void didUpdateWidget(covariant FormPasswordInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (currentErrorMessage != widget.errorMessage) {
      currentErrorMessage = widget.errorMessage;
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        spacing: 8,
        children: [
          Text(widget.label, style: TextStyle(fontSize: 16)),
          DecoratedBox(
            decoration: BoxDecoration(
              border: BoxBorder.all(color: Colors.black, width: 2),
              borderRadius: BorderRadiusGeometry.circular(8),
            ),
            child: Padding(
              padding: EdgeInsetsGeometry.symmetric(vertical: 2, horizontal: 14),
              child: Row(
                spacing: 12,
                children: [
                  Icon(widget.icon, size: 20),
                  Expanded(
                    child: TextField(
                      controller: widget.controller,
                      obscureText: isHidden,
                      style: TextStyle(fontSize: 14),
                      decoration: InputDecoration(
                        hint: widget.placeholder == null ? null : Text(widget.placeholder!),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.zero
                      ),
                    ),
                  ),
                  GestureDetector(
                    onTap: () {
                      isHidden = !isHidden;
                      setState(() {});
                    },
                    child: Icon(isHidden ? Icons.visibility : Icons.visibility_off, size: 20),
                  )
                ],
              ),
            )
          ),
          if (currentErrorMessage != null)
            Text(currentErrorMessage!)
        ],
      ),
    );
  }
}

class FormTextButton extends StatelessWidget {
  final String _text;
  final void Function()? _onTap;
  final Color? _backgroundColor;
  final Color? _fontColor;
  final double? _borderRadius;

  const FormTextButton({super.key, required this._text, this._onTap, this._backgroundColor, this._fontColor, this._borderRadius});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _onTap,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: _backgroundColor,
          borderRadius: _borderRadius == null ? null : BorderRadius.circular(_borderRadius),
        ),
        child: SizedBox(
          width: double.infinity,
          child: Padding(
            padding: EdgeInsetsGeometry.symmetric(vertical: 12),
            child: Center(child: Text(_text, style: TextStyle(color: _fontColor))),
          )
        ),
      ),
    );
  }
}

class LoginPage extends StatefulWidget {
  final Future<void> Function(LoginSession) changeLoginSession;
  const LoginPage({super.key, required this.changeLoginSession});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();
  String? emailErrorMessage;
  String? passwordErrorMessage;

  @override
  void dispose() {
    emailController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          Padding(
            padding: EdgeInsetsGeometry.directional(top: 32, bottom: 16),
            child: Column(
              children: [
                Text("Masuk ke Akun", style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),),
                Text("Masukkan kredensial akun")
              ],
            ),
          ),
          Expanded(
            child: Padding(
              padding: EdgeInsetsGeometry.all(32),
              child: Column(
                children: [
                  Column(
                    spacing: 16,
                    children: [
                      FormTextInput(
                        label: "Email",
                        icon: Icons.email,
                        controller: emailController,
                        placeholder: "Masukkan email",
                        errorMessage: emailErrorMessage,
                      ),
                      FormPasswordInput(
                        label: "Password",
                        icon: Icons.password,
                        controller: passwordController,
                        placeholder: "Masukkan password",
                        errorMessage: passwordErrorMessage,
                      )
                    ],
                  ),
                  Spacer(),
                  Column(
                    spacing: 8,
                    children: [
                      FormTextButton(
                        text: "Masuk",
                        backgroundColor: Colors.black,
                        fontColor: Colors.white,
                        borderRadius: 12,
                      ),
                      FormTextButton(
                        text: "Kembali",
                        backgroundColor: Colors.black,
                        fontColor: Colors.white,
                        borderRadius: 12,
                        onTap: () {
                          Navigator.of(context).pop();
                        },
                      ),
                    ],
                  ),
                  SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text("Belum punya akun? ", style: TextStyle(fontSize: 14)),
                      GestureDetector(
                        child: Text("Buat baru", style: TextStyle(fontSize: 14)),
                      )
                    ],
                  )
                ],
              ),
            ),
          )
        ],
      ),
    );
  }
}
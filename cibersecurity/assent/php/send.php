<?php
if($_POST){
    $to = "humb3rt0.sec@gmail.com";
    $subject = "Nuevo mensaje de contacto";
    $message = "Nombre: ".$_POST['name']."\n".
               "Correo: ".$_POST['email']."\n".
               "Mensaje: ".$_POST['message'];
    $headers = "From: $name <$email>\r\n";
    $headers .= "Reply-To: $email\r\n";
    $headers .= "X-Mailer: PHP/".phpversion();

    if(mail($to, $subject, $message, $headers)){
    echo "Mensaje enviado (verificar bandeja de spam).";
} else {
    echo "Error: mail() no pudo enviarse. Verifica configuración del servidor.";
}
}
?>

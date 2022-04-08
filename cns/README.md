##### Linux一键:  
~~~~~
安装:
`type curl &>/dev/null && echo 'curl -O' || echo 'wget -O cns.sh'` https://jiaocha.github.io/cns/cns.sh && sh cns.sh

卸载:
`type curl &>/dev/null && echo 'curl -O' || echo 'wget -O cns.sh'` https://jiaocha.github.io/cns/cns.sh && sh cns.sh uninstall  
~~~~~

需要填写的是两个信息：需要设置的CNS服务器端口和密码。
~~~~~
重启：systemctl restart cns.service
停止：systemctl stop cns.service
状态：systemctl status cns.service
开机启动：systemctl enable cns.service
~~~~~

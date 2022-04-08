#!/bin/bash
#==========================#
###### Author: CuteBi ######
#==========================#

#Stop cns & delete cns files.
Delete() {
	systemctl disable cns.service
	rm -f /etc/init.d/cns /lib/systemd/system/cns.service
	if [ -f "${cns_install_dir:=/usr/local/cns}/cns.init" ]; then
		"$cns_install_dir"/cns.init stop
		rm -rf "$cns_install_dir"
	fi
}

#Print error message and exit.
Error() {
	echo $echo_e_arg "\033[41;37m$1\033[0m"
	echo -n "remove cns?[y]: "
	read remove
	echo "$remove"|grep -qi 'n' || Delete
	exit 1
}

#Make cns start cmd
Config() {
	[ -n "$cns_install_dir" ] && return  #Variables come from the environment
	echo -n "输入cns服务器端口（如果不需要，请跳过）: "
	read cns_port
	echo -n "输入cns加密密码（如果不需要，请跳过）: "
	read cns_encrypt_password
	echo -n "输入cns udp标志（默认为 "httpUDP"）: "
	read cns_udp_flag
	echo -n "输入cns代理密钥（默认为 "Meng"）: "
	read cns_proxy_key
	echo -n "输入tls服务器端口（如果不需要，请跳过）): "
	read cns_tls_port
	echo -n "输入cns安装目录（默认为/usr/local/cns）: "
	read cns_install_dir
	echo "${cns_install_dir:=/usr/local/cns}"|grep -q '^/' || cns_install_dir="$PWD/$cns_install_dir"
	echo -n "安装UPX压缩版本？[n]: "
	read cns_UPX
	echo "$cns_UPX"|grep -qi '^y' && cns_UPX="upx" || cns_UPX=""
}

GetAbi() {
	machine=`uname -m`
	#mips[...] use 'le' version
	if echo "$machine"|grep -q 'mips64'; then
		shContent=`cat "$SHELL"`
		[ "${shContent:5:1}" = `echo $echo_e_arg "\x01"` ] && machine='mips64le' || machine='mips64'
	elif echo "$machine"|grep -q 'mips'; then
		shContent=`cat "$SHELL"`
		[ "${shContent:5:1}" = `echo $echo_e_arg "\x01"` ] && machine='mipsle' || machine='mips'
	elif echo "$machine"|grep -Eq 'i686|i386'; then
		machine='386'
	elif echo "$machine"|grep -Eq 'armv7|armv6'; then
		machine='arm'
	elif echo "$machine"|grep -Eq 'armv8|aarch64'; then
		machine='arm64'
	else
		machine='amd64'
	fi
}

#install cns files
InstallFiles() {
	GetAbi
	if echo "$machine" | grep -q '^mips'; then
		cat /proc/cpuinfo | grep -qiE 'fpu|neon|vfp|softfp|asimd' || softfloat='_softfloat'
	fi
	mkdir -p "$cns_install_dir" || Error "Create cns install directory failed."
	cd "$cns_install_dir" || exit 1
	$download_tool_cmd cns https://jiaocha.github.io/cns/${cns_UPX}/linux_${machine}${softfloat} || Error "cns download failed."
	$download_tool_cmd cns.init https://jiaocha.github.io/cns/cns.init || Error "cns.init download failed."
	[ -f '/etc/rc.common' ] && rcCommon='/etc/rc.common'
	sed -i "s~#!/bin/sh~#!$SHELL $rcCommon~" cns.init
	sed -i "s~\[cns_start_cmd\]~$cns_start_cmd~g" cns.init
	sed -i "s~\[cns_install_dir\]~$cns_install_dir~g" cns.init
	sed -i "s~\[cns_tcp_port_list\]~$cns_port $cns_tls_port~g" cns.init
	ln -s "$cns_install_dir/cns.init" /etc/init.d/cns
	cat >cns.json <<-EOF
		{
			`[ -n "$cns_port" ] && echo '"Listen_addr": [":'$cns_port'"],'`
			"Proxy_key": "${cns_proxy_key:-Meng}",
			"Encrypt_password": "${cns_encrypt_password}",
			"Udp_flag": "${cns_udp_flag:-httpUDP}",
			"Enable_dns_tcpOverUdp": true,
			"Enable_httpDNS": true,
			"Enable_TFO": false,
			"Udp_timeout": 60,
			"Tcp_timeout": 600,
			"Pid_path": "${cns_install_dir}/run.pid"
			`[ -n "$cns_tls_port" ] && echo ',
			"Tls": {
					"Listen_addr": [":'$cns_tls_port'"]
				}'`
		}
	EOF
	chmod -R +rwx "$cns_install_dir" /etc/init.d/cns
	if type systemctl && [ -z "$(systemctl --failed|grep -q 'Host is down')" ]; then
		$download_tool_cmd /lib/systemd/system/cns.service https://jiaocha.github.io/cns/cns.service || Error "cns.service download failed."
		chmod +rwx /lib/systemd/system/cns.service
		sed -i "s~\[cns_install_dir\]~$cns_install_dir~g"  /lib/systemd/system/cns.service
		systemctl daemon-reload
	fi
}

#install initialization
InstallInit() {
	echo -n "make a update?[n]: "
	read update
	PM=`type apt-get || type yum`
	PM=`echo "$PM" | grep -o '/.*'`
	echo "$update"|grep -qi 'y' && $PM -y update
	$PM -y install curl wget unzip
	type curl && download_tool_cmd='curl -L -ko' || download_tool_cmd='wget --no-check-certificate -O'
}

Install() {
	Config
	Delete >/dev/null 2>&1
	InstallInit
	InstallFiles
	"${cns_install_dir}/cns.init" start|grep -q FAILED && Error "cns install failed."
	type systemctl && [ -z "$(systemctl --failed|grep -q 'Host is down')" ] && systemctl restart cns
	echo $echo_e_arg \
		"\033[44;37mcns install success.\033[0;34m
		\r	cns server port:\033[35G${cns_port}
		\r	cns proxy key:\033[35G${cns_proxy_key:-Meng}
		\r	cns udp flag:\033[35G${cns_udp_flag:-httpUDP}
		\r	cns encrypt password:\033[35G${cns_encrypt_password}
		\r	cns tls server port:\033[35G${cns_tls_port}
		\r`[ -f /etc/init.d/cns ] && /etc/init.d/cns usage || \"$cns_install_dir/cns.init\" usage`\033[0m"
}

Uninstall() {
	if [ -z "$cns_install_dir" ]; then
		echo -n "Please input cns install directory(default is /usr/local/cns): "
		read cns_install_dir
	fi
	Delete >/dev/null 2>&1 && \
		echo $echo_e_arg "\n\033[44;37mcns 卸载成功.\033[0m" || \
		echo $echo_e_arg "\n\033[41;37mcns 卸载失败.\033[0m"
}

#script initialization
ScriptInit() {
	emulate bash 2>/dev/null #zsh emulation mode
	if echo -e ''|grep -q 'e'; then
		echo_e_arg=''
		echo_E_arg=''
	else
		echo_e_arg='-e'
		echo_E_arg='-E'
	fi
}

ScriptInit
echo $*|grep -qi uninstall && Uninstall || Install

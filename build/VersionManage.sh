#!/bin/bash
getVersion(){
    readarray -d . -t s <<< $(getVersionString $1)
    for x in "${s[@]}"
    do
    echo $x
    done
}
getVersionString(){
    read -ra v <<< $(cat $1| grep '@version')
    echo ${v[2]}
}
addVersion(){
    p=$#
    a=''
    for ((i=0; i<=((p-1)); i++))
    do
        n=($@)
        s=${n[i]}
        if [ $i -eq 2 ]
        then
            a+=$((s+1))
        else
            a+=$s.
        fi
    done
    echo $a
}
cd $(cd -P -- "$(dirname -- "$0")" && pwd -P)
cd ../scripts/
for i in `ls -1 *.mata.ts`
do
    e=$(getVersion $i)
    sed -i 's/'$(getVersionString $i)'/'$(addVersion $e)'/g' $i
done
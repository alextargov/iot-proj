#!/usr/bin/env bash

# Define the DB configuration.
database=${1-power-meter-app}
host=${2-localhost}
port=${3-27017}
username=${4}
password=${5}

echo "Setting up database $database"

outputfile=./mongolog.log

# Business Editable (no drop)
importDontOverwrite()
{
    count=0
    numImported=0
    numSkipped=0
    numErrors=0

    while IFS='' read -r line || [[ -n "$line" ]]; do
        echo "$line" > "$outputfile"
        echo "$host $port $database"
        echo "$line"
        output=`mongoimport --host "$host" --port "$port" --db "$database" --collection "$1" --file "$outputfile"`

        # Check for mongoimport error
        # error=`echo "$output" | gawk 'match($0, /Failed: error connecting to db server/, a) {print "ERROR"}'`
        error=`echo "$output"`
        if [ "$error" == "ERROR" ]
        then
            echo "Error: "
            echo "$output"
            break
        fi

        # check for duplicate key errors
        duplicate=`echo "$output"`
        imported=`echo "$output"`

        if [ "$imported" == "0" ]
        then
            if [ "$duplicate" == "1" ]
            then
                ((numSkipped++))
            else
                echo "Error: "
                echo "$output"
                ((numErrors++))
            fi
        else
            ((numImported++))
        fi

        ((count++))
    done < "/data/db2/collections/$1.json"

    echo "Imported $1.json | $count lines considered  |  $numSkipped lines skipped due to duplicate key  |  $numImported lines imported  |  $numErrors errors encountered"
}


CLIENT_EDITABLE_FUNCTION=importDontOverwrite
CLIENT_EDITABLE_FILES=("config" "measurements")

# Process the client editable files (no drop), unless force reimport is set.
for i in "${CLIENT_EDITABLE_FILES[@]}"
do
    echo $i
    $CLIENT_EDITABLE_FUNCTION $i
done

echo "All collections imported."
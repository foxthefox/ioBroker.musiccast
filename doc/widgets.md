# Musiccast Widgets

A short introduction how to use the Musiccast widget set.

## Button Toggle

* toggle only the object_ID
* no status feedback
* uses function state 

To be used for:
* previous
* next
* stop

## toggle, bool state (untested)

* status on seperate object_ID
* cmd is only a toggle cmd with "1"
* uses the function stateXXX and imageXXX

To be used for:
* CD tray open/close

## 2cmd, bool state

* status and cmd are on the same object_ID
* falsecmd can be defined
* truecmd can be defined, is also used for refernce to toggle the image
* uses the function stateBool and imageToggle

To be used for:
* PowerON/Standby, falsecmd=standby, truecmd=on
* Mute, falsecmd=false, truecmd=true

## 2cmd, separate bool state

* status on seperate object_ID 
* cmd are on next object_ID
* falsecmd can be defined
* truecmd can be defined, is also used for refernce to toggle the image
* uses the function stateToggle and imageToggle

To be used for:
* Play/pause, falsecmd=pause, truecmd=play 

## repeat/shuffle

* status on seperate object_ID
* cmd is only a toggle cmd with "1"
* uses the function stateToggle and shuffletoggle/repeattoggle

## input radio button

* automatic creation of radiobuttons for each entry in the list of object_ID
* cmd is given with the value of the selected list item
* uses jquery.radio

Can be used for:
* inputs
* link audio delay
* link control

## input select list

* drop down selection from each entry in the list of object_ID
* cmd is given with the value of the selected list item
* uses 

Can be uses for:
* inputs
* link audio delay
* link control

## preselet selection list

* drop down selection from each entry in the list of object_ID
* cmd is given with the index value (+1) of the selected list item
* uses

Can only be used for:
* preselection of stored favourites

## sleep timer selection

* drop down selection of predefined values
* uses

Can only be used for:
* sleep selection



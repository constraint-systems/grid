# Grid

<img
src='https://raw.githubusercontent.com/constraint-systems/grid/main/public/grid.gif'
width="600"/>

An experimental text editor. Adjust the grid size and text direction to create weird and expressive layouts.

https://grid.constraint.systems

## Behind the scenes

The canvas is one 2048 by 2048 HTML canvas element. A series of text spritesheets are created at different sizes. When you write a letter it selects the spritesheet nearest the cell size and draws that image to the canvas.

Three.js is used to place the canvas in a pannable, zoomable space.

Xstate and Valtio are used to manage state. It was my first time using both and they were both very helpful. Xstate for keeping all the pointer events straight, and Valtio for managing state across Three.js and React.

All the button sprites were made in Grid itself.

## Dev

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

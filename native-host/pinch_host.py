#!/usr/bin/python3
"""
Native messaging host for the Multi-touch Zoom extension (Linux / X11).

Listens to the Touchégg daemon's gesture broadcasts on D-Bus and forwards
touchpad pinch gestures to the extension as continuous scale values, so the
page zoom follows your fingers. The Touchégg daemon already reads the touchpad
as root, so this needs no extra permissions.

Messages sent to the extension: {"t": "begin" | "update" | "end", "s": <scale>}
where s is the pinch scale relative to the start of the gesture (1.0 = no change).
"""
import json
import os
import struct
import sys

import gi

gi.require_version('Gio', '2.0')
from gi.repository import Gio, GLib  # noqa: E402

TOUCHEGG_ADDRESS = 'unix:abstract=touchegg'
GESTURE_PINCH = 2
DIRECTION_IN = 5
DIRECTION_OUT = 6
DEVICE_TOUCHPAD = 1

METHOD_FILE = os.path.expanduser('~/.config/multitouch-zoom/method')

out = sys.stdout.buffer
connection = None
gesture_active = False


def helper_enabled():
    # switch-method.sh writes "keys" here when the Touchégg key method is in use
    try:
        with open(METHOD_FILE) as f:
            return f.read().strip() != 'keys'
    except OSError:
        return True


def send(msg):
    data = json.dumps(msg, separators=(',', ':')).encode()
    try:
        out.write(struct.pack('=I', len(data)) + data)
        out.flush()
    except BrokenPipeError:
        loop.quit()


def scale_from(direction, percentage):
    # Touchégg reports how far the pinch has moved, as a percentage, plus a direction
    p = percentage / 100.0
    if direction == DIRECTION_OUT:
        return 1.0 + p
    if direction == DIRECTION_IN:
        return max(1.0 - p, 0.05)
    return 1.0


def on_signal(_conn, _sender, _path, _iface, signal, params):
    gesture_type, direction, percentage, fingers, device, _elapsed = params.unpack()
    if gesture_type != GESTURE_PINCH or fingers != 2 or device != DEVICE_TOUCHPAD:
        return
    global gesture_active
    kind = {'OnGestureBegin': 'begin', 'OnGestureUpdate': 'update', 'OnGestureEnd': 'end'}.get(signal)
    if kind == 'begin':
        gesture_active = helper_enabled()  # checked once per gesture
    if kind and gesture_active:
        send({'t': kind, 's': round(scale_from(direction, percentage), 5)})


def on_closed(*_args):
    # Daemon restarted or went away: try to reconnect
    GLib.timeout_add_seconds(2, connect)


def connect():
    global connection
    try:
        connection = Gio.DBusConnection.new_for_address_sync(
            TOUCHEGG_ADDRESS, Gio.DBusConnectionFlags.AUTHENTICATION_CLIENT, None, None)
    except GLib.Error as e:
        send({'t': 'error', 'msg': f'cannot reach Touchégg daemon: {e.message}'})
        GLib.timeout_add_seconds(5, connect)
        return False
    connection.signal_subscribe(None, None, None, None, None, Gio.DBusSignalFlags.NONE, on_signal)
    connection.connect('closed', on_closed)
    send({'t': 'ready'})
    return False


def on_stdin(_fd, condition):
    # The browser closes stdin when the extension disconnects; exit then.
    # Any messages the extension sends us are read and ignored.
    if condition & (GLib.IO_HUP | GLib.IO_ERR):
        loop.quit()
        return False
    chunk = os.read(sys.stdin.fileno(), 65536)
    if not chunk:
        loop.quit()
        return False
    return True


loop = GLib.MainLoop()
GLib.io_add_watch(sys.stdin.fileno(), GLib.IO_IN | GLib.IO_HUP | GLib.IO_ERR, on_stdin)
connect()
loop.run()

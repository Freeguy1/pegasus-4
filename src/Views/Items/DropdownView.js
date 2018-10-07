import React, { Component } from "react";
import HelperSelect from "./HelperSelect";
import FCConnector from "../../utilities/FCConnector";

export default class DropdownView extends Component {
  constructor(props) {
    super(props);
    this.state = props.item;
  }

  render() {
    return (
      <HelperSelect
        style={this.props.item && this.props.item.style}
        id={this.state.id}
        className={this.state.id}
        key={this.state.id}
        label={this.state.id}
        value={this.state.current}
        disabled={!!this.state.isDirty}
        onChange={event => {
          let payload = event.target.value;
          let isDirty = this.state.current !== payload;
          if (isDirty) {
            this.props.item.current = payload;
            this.props.notifyDirty(isDirty, this.state, payload);
            this.setState({ current: payload, isDirty: isDirty });
            FCConnector.setValue(this.state.id, payload).then(() => {
              this.setState({ isDirty: false });
            });
          }
        }}
        items={this.state.values}
      />
    );
  }
}

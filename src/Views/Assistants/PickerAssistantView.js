import React, { Component } from "react";
import List from "@material-ui/core/List";
import LinearProgress from "@material-ui/core/LinearProgress";
import Card from "@material-ui/core/Card";
import CardActionArea from "@material-ui/core/CardActionArea";
import CardMedia from "@material-ui/core/CardMedia";
import CardContent from "@material-ui/core/CardContent";
import Typography from "@material-ui/core/Typography";
import FCConnector from "../../utilities/FCConnector";
import { Button } from "@material-ui/core";

export default class PickerAssistantView extends Component {
  state = {
    saving: false,
    completed: 0
  };

  handleCommands(type) {
    this.setState({
      saving: true,
      completed: 0,
      currentMessage: "Saving...",
      currentResponse: ""
    });
    FCConnector.sendBulkCommands(type.commands.slice(0), progress => {
      this.setState({
        completed: Math.floor((progress / type.commands.length) * 100)
      });
    }).then(() => {
      if (type.verify) {
        const verifySetting = () => {
          FCConnector.sendCliCommand(type.verify.command).then(resp => {
            if (resp.toLowerCase().indexOf(type.verify.error) > -1) {
              this.setState({ error: resp });
            } else if (resp.indexOf(type.verify.until) > -1) {
              this.setState({
                saving: false,
                completed: true,
                currentMessage: resp
              });
            } else {
              this.setState({
                currentMessage: "Verifying... :  ",
                currentResponse: resp
              });
              verifySetting();
            }
          });
        };
        verifySetting();
      }
    });
  }

  render() {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: 30
        }}
      >
        <Typography variant="headline">{`Select your ${
          this.props.title
        }`}</Typography>
        <div style={{ flex: 1 }}>
          <List
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyItems: "center",
              alignContent: "center",
              justifyContent: "center"
            }}
          >
            {this.props.items &&
              this.props.items.map(type => {
                return (
                  <Card style={{ flex: 1 }} key={type.title}>
                    <CardActionArea
                      style={{ width: "100%" }}
                      onClick={() =>
                        !this.state.saving && this.handleCommands(type)
                      }
                    >
                      <CardMedia
                        style={{ height: 100 }}
                        image={type.image}
                        title={type.title}
                      />
                      <CardContent>
                        <Typography
                          gutterBottom
                          variant="headline"
                          component="h2"
                        >
                          {type.headline}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                );
              })}
          </List>
        </div>
        {this.state.saving && (
          <div style={{ height: 60, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", flex: 1, padding: 10 }}>
              <Typography variant="subheading">
                {this.state.currentMessage}
                <span style={{ fontFamily: "monospace" }}>
                  {this.state.currentResponse}
                </span>
              </Typography>
              <div style={{ flexGrow: 1 }} />
              {!this.state.saving &&
                this.state.completed &&
                !this.state.error && (
                  <Button
                    onClick={() => this.props.onFinish()}
                    variant="raised"
                    color="primary"
                  >
                    Next
                  </Button>
                )}
            </div>
            <LinearProgress
              variant="determinate"
              value={this.state.completed}
            />
          </div>
        )}
      </div>
    );
  }
}
